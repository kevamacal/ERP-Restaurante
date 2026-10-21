import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "../supabaseClient";
import type {
  AnalyticsCoverage,
  AnalyticsDailyRow,
  AnalyticsHourlyRow,
  AnalyticsPeriodTotals,
  AnalyticsTimeseriesRow,
  AnalyticsTopDay,
  AnalyticsWeekdayRow,
} from "../types";
import {
  getAutoGranularity,
  resolveRangePreset,
  type Granularity,
  type RangePreset,
  type ResolvedRange,
} from "../utils/analytics";
import { addDays, addMonths, previousRange } from "../utils/periods";

const PAGE_SIZE = 50;

function toNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function mapCoverage(row: AnalyticsCoverage | undefined): AnalyticsCoverage | null {
  if (!row) return null;
  return {
    primera_venta: row.primera_venta,
    ultima_venta: row.ultima_venta,
    primera_hora: row.primera_hora,
    ultima_hora: row.ultima_hora,
    dias_diarios: toNumber(row.dias_diarios),
    dias_horarios: toNumber(row.dias_horarios),
  };
}

function mapTotals(row: AnalyticsPeriodTotals | undefined): AnalyticsPeriodTotals | null {
  if (!row) return null;
  return {
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    efectivo: toNumber(row.efectivo),
    tarjeta: toNumber(row.tarjeta),
    pendiente: toNumber(row.pendiente),
    dias_con_datos: toNumber(row.dias_con_datos),
    dias_horarios: toNumber(row.dias_horarios),
    primera_fecha: row.primera_fecha,
    ultima_fecha: row.ultima_fecha,
    mejor_fecha: row.mejor_fecha,
    mejor_facturado: toNumber(row.mejor_facturado),
    peor_fecha: row.peor_fecha,
    peor_facturado: toNumber(row.peor_facturado),
  };
}

function mapDailyRows(rows: AnalyticsDailyRow[]): AnalyticsDailyRow[] {
  return rows.map((row) => ({
    fecha: row.fecha,
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    efectivo: toNumber(row.efectivo),
    tarjeta: toNumber(row.tarjeta),
    pendiente: toNumber(row.pendiente),
    ultima_actualizacion: row.ultima_actualizacion,
    total_count: toNumber(row.total_count),
  }));
}

function mapTimeseries(rows: AnalyticsTimeseriesRow[]): AnalyticsTimeseriesRow[] {
  return rows.map((row) => ({
    bucket_start: row.bucket_start,
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    efectivo: toNumber(row.efectivo),
    tarjeta: toNumber(row.tarjeta),
    pendiente: toNumber(row.pendiente),
    dias_con_datos: toNumber(row.dias_con_datos),
  }));
}

function mapHourly(rows: AnalyticsHourlyRow[]): AnalyticsHourlyRow[] {
  return rows.map((row) => ({
    dia_semana: toNumber(row.dia_semana),
    hora: toNumber(row.hora),
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    dias_con_datos: toNumber(row.dias_con_datos),
  }));
}

function mapWeekday(rows: AnalyticsWeekdayRow[]): AnalyticsWeekdayRow[] {
  return rows.map((row) => ({
    dia_semana: toNumber(row.dia_semana),
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    dias_con_datos: toNumber(row.dias_con_datos),
  }));
}

function mapTopDays(rows: AnalyticsTopDay[]): AnalyticsTopDay[] {
  return rows.map((row) => ({
    fecha: row.fecha,
    facturado: toNumber(row.facturado),
    tickets: toNumber(row.tickets),
    ticket_medio: toNumber(row.ticket_medio),
  }));
}

interface Scope {
  empresaId?: string;
  localId: string | null;
  ok: boolean;
}

function useScope(selectedLocal: string, empresaId?: string): Scope {
  return useMemo(() => {
    const localId = selectedLocal === "all" ? null : selectedLocal;
    return { empresaId, localId, ok: Boolean(empresaId || localId) };
  }, [selectedLocal, empresaId]);
}

export interface UseAnalyticsResult {
  preset: RangePreset;
  setPreset: (preset: RangePreset) => void;
  customFrom: string;
  setCustomFrom: (value: string) => void;
  customTo: string;
  setCustomTo: (value: string) => void;
  granularity: Granularity;
  setGranularity: (value: Granularity) => void;
  range: ResolvedRange | null;
  coverage: AnalyticsCoverage | null;
  coverageLoading: boolean;
  coverageError: string | null;
  totals: AnalyticsPeriodTotals | null;
  timeseries: AnalyticsTimeseriesRow[];
  dailyRows: AnalyticsDailyRow[];
  dailyTotal: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  hourly: AnalyticsHourlyRow[];
  previousHourly: AnalyticsHourlyRow[];
  weekdayTotals: AnalyticsWeekdayRow[];
  topDays: AnalyticsTopDay[];
  bottomDays: AnalyticsTopDay[];
  loading: boolean;
  error: string | null;
  requiresLocal: boolean;
  refetch: () => void;
}

export function useAnalytics(
  selectedLocal: string,
  empresaId?: string
): UseAnalyticsResult {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [granularityOverride, setGranularityOverride] = useState<Granularity | null>(null);
  const [page, setPage] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [coverage, setCoverage] = useState<AnalyticsCoverage | null>(null);
  const [coverageLoading, setCoverageLoading] = useState<boolean>(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  const [totals, setTotals] = useState<AnalyticsPeriodTotals | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesRow[]>([]);
  const [hourly, setHourly] = useState<AnalyticsHourlyRow[]>([]);
  const [previousHourly, setPreviousHourly] = useState<AnalyticsHourlyRow[]>([]);
  const [weekdayTotals, setWeekdayTotals] = useState<AnalyticsWeekdayRow[]>([]);
  const [topDays, setTopDays] = useState<AnalyticsTopDay[]>([]);
  const [bottomDays, setBottomDays] = useState<AnalyticsTopDay[]>([]);

  const [dailyRows, setDailyRows] = useState<AnalyticsDailyRow[]>([]);
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useScope(selectedLocal, empresaId);
  const requiresLocal = selectedLocal === "all" && !empresaId;

  const range = useMemo(
    () => resolveRangePreset(preset, coverage, customFrom, customTo),
    [preset, coverage, customFrom, customTo]
  );

  const granularity = useMemo<Granularity>(() => {
    if (granularityOverride) return granularityOverride;
    return range ? getAutoGranularity(range.from, range.to) : "day";
  }, [granularityOverride, range]);

  const previous = useMemo(() => {
    if (!range || preset === "all") return null;
    return previousRange(range.from, range.to);
  }, [range, preset]);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    setPage(0);
  }, [preset, customFrom, customTo, selectedLocal, empresaId]);

  // Cobertura: se consulta una vez por ámbito y sirve para los presets "Todo".
  useEffect(() => {
    let cancelled = false;

    if (!scope.ok) {
      setCoverage(null);
      setCoverageLoading(false);
      setCoverageError(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setCoverageError("Supabase no está configurado.");
      return;
    }

    setCoverageLoading(true);
    setCoverageError(null);

    Promise.resolve(
      supabase.rpc("analytics_coverage", {
        p_empresa_id: scope.empresaId ?? null,
        p_local_id: scope.localId,
      })
    )
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setCoverageError(rpcError.message);
          setCoverage(null);
          return;
        }
        const rows = (data ?? []) as AnalyticsCoverage[];
        setCoverage(mapCoverage(rows[0]));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setCoverageError(caught instanceof Error ? caught.message : "Error de red");
      })
      .finally(() => {
        if (!cancelled) setCoverageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, refreshKey]);

  // Totales, serie, perfil horario y extremos.
  useEffect(() => {
    let cancelled = false;

    if (!scope.ok || !range) {
      setTotals(null);
      setTimeseries([]);
      setHourly([]);
      setPreviousHourly([]);
      setWeekdayTotals([]);
      setTopDays([]);
      setBottomDays([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setLoading(true);
    setError(null);

    const params = {
      p_empresa_id: scope.empresaId ?? null,
      p_local_id: scope.localId,
    };

    Promise.all([
      supabase.rpc("analytics_period_totals", {
        p_desde: range.from,
        p_hasta: range.to,
        ...params,
      }),
      supabase.rpc("analytics_timeseries", {
        p_desde: range.from,
        p_hasta: range.to,
        p_bucket: granularity,
        ...params,
      }),
      supabase.rpc("analytics_hourly_profile", {
        p_desde: range.from,
        p_hasta: range.to,
        ...params,
      }),
      previous
        ? supabase.rpc("analytics_hourly_profile", {
            p_desde: previous.from,
            p_hasta: previous.to,
            ...params,
          })
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("analytics_weekday_totals", {
        p_desde: range.from,
        p_hasta: range.to,
        ...params,
      }),
      supabase.rpc("analytics_top_days", {
        p_desde: range.from,
        p_hasta: range.to,
        p_order: "best",
        p_limit: 5,
        ...params,
      }),
      supabase.rpc("analytics_top_days", {
        p_desde: range.from,
        p_hasta: range.to,
        p_order: "worst",
        p_limit: 5,
        ...params,
      }),
    ])
      .then((responses) => {
        if (cancelled) return;
        const failed = responses.find((response) => response.error);
        if (failed?.error) {
          setError(failed.error.message);
          return;
        }

        const [totalsRes, seriesRes, hourlyRes, previousRes, weekdayRes, topRes, bottomRes] =
          responses;
        setTotals(mapTotals(((totalsRes.data ?? []) as AnalyticsPeriodTotals[])[0]));
        setTimeseries(mapTimeseries((seriesRes.data ?? []) as AnalyticsTimeseriesRow[]));
        setHourly(mapHourly((hourlyRes.data ?? []) as AnalyticsHourlyRow[]));
        setPreviousHourly(mapHourly((previousRes.data ?? []) as AnalyticsHourlyRow[]));
        setWeekdayTotals(mapWeekday((weekdayRes.data ?? []) as AnalyticsWeekdayRow[]));
        setTopDays(mapTopDays((topRes.data ?? []) as AnalyticsTopDay[]));
        setBottomDays(mapTopDays((bottomRes.data ?? []) as AnalyticsTopDay[]));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Error de red");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, range, granularity, previous, refreshKey]);

  // Página de la tabla diaria, separada para no recargar los agregados al paginar.
  useEffect(() => {
    let cancelled = false;

    if (!scope.ok || !range) {
      setDailyRows([]);
      setDailyTotal(0);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    Promise.resolve(
      supabase.rpc("analytics_daily_page", {
        p_desde: range.from,
        p_hasta: range.to,
        p_empresa_id: scope.empresaId ?? null,
        p_local_id: scope.localId,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      })
    )
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        const rows = mapDailyRows((data ?? []) as AnalyticsDailyRow[]);
        setDailyRows(rows);
        setDailyTotal(rows[0]?.total_count ?? 0);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Error de red");
      });

    return () => {
      cancelled = true;
    };
  }, [scope, range, page, refreshKey]);

  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    granularity,
    setGranularity: setGranularityOverride,
    range,
    coverage,
    coverageLoading,
    coverageError,
    totals,
    timeseries,
    dailyRows,
    dailyTotal,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    hourly,
    previousHourly,
    weekdayTotals,
    topDays,
    bottomDays,
    loading,
    error,
    requiresLocal,
    refetch,
  };
}

/* ------------------------------------------------------------------ */
/* Calendario de un año                                                */
/* ------------------------------------------------------------------ */

export function useDailyYear(
  selectedLocal: string,
  empresaId: string | undefined,
  year: number | null
) {
  const scope = useScope(selectedLocal, empresaId);
  const [rows, setRows] = useState<AnalyticsDailyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!scope.ok || year === null) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    Promise.resolve(
      supabase.rpc("analytics_daily_page", {
        p_desde: `${year}-01-01`,
        p_hasta: `${year}-12-31`,
        p_empresa_id: scope.empresaId ?? null,
        p_local_id: scope.localId,
        p_limit: 400,
        p_offset: 0,
      })
    )
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setRows(mapDailyRows((data ?? []) as AnalyticsDailyRow[]));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Error de red");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, year]);

  return { rows, loading, error };
}

/* ------------------------------------------------------------------ */
/* Comparativa de dos periodos                                         */
/* ------------------------------------------------------------------ */

export interface ComparisonPeriod {
  from: string;
  to: string;
}

export function usePeriodComparison(
  selectedLocal: string,
  empresaId: string | undefined,
  mode: "week" | "month",
  periodA: ComparisonPeriod | null,
  periodB: ComparisonPeriod | null
) {
  const scope = useScope(selectedLocal, empresaId);
  const [totalsA, setTotalsA] = useState<AnalyticsPeriodTotals | null>(null);
  const [totalsB, setTotalsB] = useState<AnalyticsPeriodTotals | null>(null);
  const [weekdayA, setWeekdayA] = useState<AnalyticsWeekdayRow[]>([]);
  const [weekdayB, setWeekdayB] = useState<AnalyticsWeekdayRow[]>([]);
  const [trend, setTrend] = useState<AnalyticsTimeseriesRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!scope.ok || !periodA || !periodB) {
      setTotalsA(null);
      setTotalsB(null);
      setWeekdayA([]);
      setWeekdayB([]);
      setTrend([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setLoading(true);
    setError(null);

    const params = {
      p_empresa_id: scope.empresaId ?? null,
      p_local_id: scope.localId,
    };

    const trendFrom =
      mode === "week"
        ? addDays(periodA.from, -7 * 11)
        : addMonths(periodA.from, -11);

    Promise.all([
      supabase.rpc("analytics_period_totals", {
        p_desde: periodA.from,
        p_hasta: periodA.to,
        ...params,
      }),
      supabase.rpc("analytics_period_totals", {
        p_desde: periodB.from,
        p_hasta: periodB.to,
        ...params,
      }),
      supabase.rpc("analytics_weekday_totals", {
        p_desde: periodA.from,
        p_hasta: periodA.to,
        ...params,
      }),
      supabase.rpc("analytics_weekday_totals", {
        p_desde: periodB.from,
        p_hasta: periodB.to,
        ...params,
      }),
      supabase.rpc("analytics_timeseries", {
        p_desde: trendFrom,
        p_hasta: periodA.to,
        p_bucket: mode === "week" ? "week" : "month",
        ...params,
      }),
    ])
      .then((responses) => {
        if (cancelled) return;
        const failed = responses.find((response) => response.error);
        if (failed?.error) {
          setError(failed.error.message);
          return;
        }

        const [resA, resB, weekA, weekB, resTrend] = responses;
        setTotalsA(mapTotals(((resA.data ?? []) as AnalyticsPeriodTotals[])[0]));
        setTotalsB(mapTotals(((resB.data ?? []) as AnalyticsPeriodTotals[])[0]));
        setWeekdayA(mapWeekday((weekA.data ?? []) as AnalyticsWeekdayRow[]));
        setWeekdayB(mapWeekday((weekB.data ?? []) as AnalyticsWeekdayRow[]));
        setTrend(mapTimeseries((resTrend.data ?? []) as AnalyticsTimeseriesRow[]));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Error de red");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, periodA, periodB, mode]);

  return { totalsA, totalsB, weekdayA, weekdayB, trend, loading, error };
}
