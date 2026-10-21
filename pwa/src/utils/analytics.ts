/**
 * Cálculos puros de las estadísticas de ventas.
 *
 * Nada de React ni de Supabase aquí: estas funciones se prueban con vitest.
 * El redondeo se deja para el formateo; los cálculos trabajan con los números
 * tal como llegan de Postgres.
 */

import type {
  AnalyticsCoverage,
  AnalyticsDailyRow,
  AnalyticsHourlyRow,
  AnalyticsPeriodTotals,
  AnalyticsTimeseriesRow,
  AnalyticsWeekdayRow,
} from "../types";
import {
  HOUR_ORDER,
  HEATMAP_HOUR_ORDER,
  addDays,
  addMonths,
  countWeekdayOccurrences,
  endOfMonthISO,
  endOfWeekISO,
  eachDate,
  monthKey,
  parseMonthKey,
  rangeLength,
  startOfMonthISO,
  startOfWeekISO,
  weekdayISO,
  weekdayLabel,
} from "./periods";
import {
  formatDateShortEs,
  formatHour,
  formatMonthEs,
  formatPercentFromRatio,
} from "./format";

export type RangePreset =
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "prev-month"
  | "year"
  | "prev-year"
  | "all"
  | "custom";

export type Granularity = "day" | "week" | "month";

export interface ResolvedRange {
  from: string;
  to: string;
}

export function resolveRangePreset(
  preset: RangePreset,
  coverage: AnalyticsCoverage | null,
  customFrom: string,
  customTo: string
): ResolvedRange | null {
  if (preset === "custom") {
    if (!customFrom || !customTo) return null;
    return customFrom <= customTo
      ? { from: customFrom, to: customTo }
      : { from: customTo, to: customFrom };
  }

  if (!coverage?.ultima_venta) return null;

  const anchor = coverage.ultima_venta;
  const first = coverage.primera_venta ?? anchor;
  let from = anchor;
  let to = anchor;

  switch (preset) {
    case "7d":
      from = addDays(anchor, -6);
      break;
    case "30d":
      from = addDays(anchor, -29);
      break;
    case "90d":
      from = addDays(anchor, -89);
      break;
    case "month":
      from = startOfMonthISO(anchor);
      to = anchor;
      break;
    case "prev-month": {
      const previous = addMonths(startOfMonthISO(anchor), -1);
      const { year, monthIndex } = parseMonthKey(monthKey(previous));
      from = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      to = endOfMonthISO(from);
      return { from, to };
    }
    case "year":
      from = `${anchor.slice(0, 4)}-01-01`;
      to = anchor;
      break;
    case "prev-year": {
      const year = Number(anchor.slice(0, 4)) - 1;
      from = `${year}-01-01`;
      to = `${year}-12-31`;
      return { from, to };
    }
    case "all":
      from = first;
      to = anchor;
      break;
    default:
      break;
  }

  if (from < first) from = first;
  return from <= to ? { from, to } : null;
}

export function getAutoGranularity(from: string, to: string): Granularity {
  const days = rangeLength(from, to);
  if (days <= 120) return "day";
  if (days <= 730) return "week";
  return "month";
}

export function bucketLabel(bucketStart: string, granularity: Granularity): string {
  if (granularity === "day") return formatDateShortEs(bucketStart);
  if (granularity === "week") return `Sem. ${formatDateShortEs(bucketStart)}`;
  if (granularity === "month") {
    const { year, monthIndex } = parseMonthKey(monthKey(bucketStart));
    return formatMonthEs(year, monthIndex);
  }
  return bucketStart.slice(0, 4);
}

export interface TimeseriesPoint {
  key: string;
  label: string;
  facturado: number;
  tickets: number;
  efectivo: number;
  tarjeta: number;
  pendiente: number;
  dias: number;
  ticketMedio: number;
  movingAverage: number;
}

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 0) return [...values];
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

export function buildTimeseriesPoints(
  rows: AnalyticsTimeseriesRow[],
  granularity: Granularity
): TimeseriesPoint[] {
  const sorted = [...rows].sort((a, b) => a.bucket_start.localeCompare(b.bucket_start));
  const values = sorted.map((row) => Number(row.facturado) || 0);
  const average = movingAverage(values, granularity === "day" ? 7 : 4);

  return sorted.map((row, index) => {
    const facturado = Number(row.facturado) || 0;
    const tickets = Number(row.tickets) || 0;
    return {
      key: row.bucket_start,
      label: bucketLabel(row.bucket_start, granularity),
      facturado,
      tickets,
      efectivo: Number(row.efectivo) || 0,
      tarjeta: Number(row.tarjeta) || 0,
      pendiente: Number(row.pendiente) || 0,
      dias: Number(row.dias_con_datos) || 0,
      ticketMedio: safeDivide(facturado, tickets),
      movingAverage: average[index] ?? 0,
    };
  });
}

export function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/* ------------------------------------------------------------------ */
/* Franjas horarias                                                    */
/* ------------------------------------------------------------------ */

export interface TimeBand {
  id: string;
  label: string;
  from: number;
  to: number;
}

export const TIME_BANDS: TimeBand[] = [
  { id: "desayuno", label: "Desayuno (06–12)", from: 6, to: 12 },
  { id: "comida", label: "Comida (12–17)", from: 12, to: 17 },
  { id: "tarde", label: "Tarde (17–20)", from: 17, to: 20 },
  { id: "cena", label: "Cena (20–24)", from: 20, to: 24 },
  { id: "madrugada", label: "Madrugada (00–02)", from: 0, to: 2 },
  { id: "sin-servicio", label: "Sin servicio (02–06)", from: 2, to: 6 },
];

export function getTimeBand(hour: number): TimeBand {
  return (
    TIME_BANDS.find((band) => hour >= band.from && hour < band.to) ??
    TIME_BANDS[TIME_BANDS.length - 1]
  );
}

/* ------------------------------------------------------------------ */
/* Perfil horario                                                      */
/* ------------------------------------------------------------------ */

export interface HourlyAggregate {
  facturado: number;
  tickets: number;
  dias: number;
}

export function aggregateByHour(rows: AnalyticsHourlyRow[]): Map<number, HourlyAggregate> {
  const map = new Map<number, HourlyAggregate>();
  rows.forEach((row) => {
    const hour = Number(row.hora);
    const current = map.get(hour) ?? { facturado: 0, tickets: 0, dias: 0 };
    current.facturado += Number(row.facturado) || 0;
    current.tickets += Number(row.tickets) || 0;
    current.dias += Number(row.dias_con_datos) || 0;
    map.set(hour, current);
  });
  return map;
}

export interface HourlyPoint {
  hora: number;
  label: string;
  facturado: number;
  tickets: number;
  dias: number;
  ticketMedio: number;
  mediaPorDia: number;
  share: number;
  cumulativeShare: number;
}

export interface BandSummary extends TimeBand {
  facturado: number;
  tickets: number;
  share: number;
  ticketMedio: number;
}

export interface HourlySummary {
  points: HourlyPoint[];
  bands: BandSummary[];
  totalFacturado: number;
  totalTickets: number;
  peakHour: number | null;
  peakFacturado: number;
  top3Share: number;
  peakTicketMedio: number;
}

export function buildHourlySummary(rows: AnalyticsHourlyRow[]): HourlySummary {
  const byHour = aggregateByHour(rows);
  const totalFacturado = Array.from(byHour.values()).reduce(
    (sum, value) => sum + value.facturado,
    0
  );
  const totalTickets = Array.from(byHour.values()).reduce(
    (sum, value) => sum + value.tickets,
    0
  );

  let cumulative = 0;
  const points: HourlyPoint[] = HEATMAP_HOUR_ORDER.map((hour) => {
    const aggregate = byHour.get(hour) ?? { facturado: 0, tickets: 0, dias: 0 };
    const share = safeDivide(aggregate.facturado, totalFacturado);
    cumulative += share;
    return {
      hora: hour,
      label: formatHour(hour),
      facturado: aggregate.facturado,
      tickets: aggregate.tickets,
      dias: aggregate.dias,
      ticketMedio: safeDivide(aggregate.facturado, aggregate.tickets),
      mediaPorDia: safeDivide(aggregate.facturado, aggregate.dias),
      share,
      cumulativeShare: cumulative,
    };
  });

  const bands: BandSummary[] = TIME_BANDS.map((band) => {
    let facturado = 0;
    let tickets = 0;
    byHour.forEach((value, hour) => {
      if (getTimeBand(hour).id === band.id) {
        facturado += value.facturado;
        tickets += value.tickets;
      }
    });
    return {
      ...band,
      facturado,
      tickets,
      share: safeDivide(facturado, totalFacturado),
      ticketMedio: safeDivide(facturado, tickets),
    };
  });

  const peak = points.reduce<HourlyPoint | null>(
    (best, point) => (best === null || point.facturado > best.facturado ? point : best),
    null
  );
  const top3 = [...points]
    .sort((a, b) => b.facturado - a.facturado)
    .slice(0, 3)
    .reduce((sum, point) => sum + point.facturado, 0);

  return {
    points,
    bands,
    totalFacturado,
    totalTickets,
    peakHour: peak && peak.facturado > 0 ? peak.hora : null,
    peakFacturado: peak?.facturado ?? 0,
    top3Share: safeDivide(top3, totalFacturado),
    peakTicketMedio: peak?.ticketMedio ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Mapa de calor día de la semana × hora                               */
/* ------------------------------------------------------------------ */

export interface HeatmapCell {
  dia: number;
  hora: number;
  facturado: number;
  tickets: number;
  dias: number;
  ocurrencias: number;
  media: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  maxMedia: number;
  maxTotal: number;
}

export function buildHeatmap(
  rows: AnalyticsHourlyRow[],
  from: string,
  to: string
): HeatmapData {
  const map = new Map<string, { facturado: number; tickets: number; dias: number }>();
  rows.forEach((row) => {
    const key = `${Number(row.dia_semana)}-${Number(row.hora)}`;
    const current = map.get(key) ?? { facturado: 0, tickets: 0, dias: 0 };
    current.facturado += Number(row.facturado) || 0;
    current.tickets += Number(row.tickets) || 0;
    current.dias += Number(row.dias_con_datos) || 0;
    map.set(key, current);
  });

  const occurrences = new Map<number, number>();
  for (let dia = 1; dia <= 7; dia += 1) {
    occurrences.set(dia, countWeekdayOccurrences(from, to, dia));
  }

  const cells: HeatmapCell[] = [];
  let maxMedia = 0;
  let maxTotal = 0;

  for (let dia = 1; dia <= 7; dia += 1) {
    const totalOccurrences = occurrences.get(dia) ?? 0;
    HEATMAP_HOUR_ORDER.forEach((hora) => {
      const aggregate = map.get(`${dia}-${hora}`) ?? {
        facturado: 0,
        tickets: 0,
        dias: 0,
      };
      const media = safeDivide(aggregate.facturado, totalOccurrences);
      maxMedia = Math.max(maxMedia, media);
      maxTotal = Math.max(maxTotal, aggregate.facturado);
      cells.push({
        dia,
        hora,
        facturado: aggregate.facturado,
        tickets: aggregate.tickets,
        dias: aggregate.dias,
        ocurrencias: totalOccurrences,
        media,
      });
    });
  }

  return { cells, maxMedia, maxTotal };
}

/* ------------------------------------------------------------------ */
/* Días de la semana y tabla diaria                                    */
/* ------------------------------------------------------------------ */

export interface WeekdayAverage {
  dia: number;
  label: string;
  facturado: number;
  tickets: number;
  dias: number;
  media: number;
  ticketsMedio: number;
}

export function buildWeekdayAverages(rows: AnalyticsWeekdayRow[]): WeekdayAverage[] {
  const map = new Map<number, AnalyticsWeekdayRow>();
  rows.forEach((row) => map.set(Number(row.dia_semana), row));

  return Array.from({ length: 7 }, (_, index) => {
    const dia = index + 1;
    const row = map.get(dia);
    const facturado = Number(row?.facturado) || 0;
    const tickets = Number(row?.tickets) || 0;
    const dias = Number(row?.dias_con_datos) || 0;
    return {
      dia,
      label: weekdayLabel(dia),
      facturado,
      tickets,
      dias,
      media: safeDivide(facturado, dias),
      ticketsMedio: safeDivide(tickets, dias),
    };
  });
}

export interface DailyTableRow {
  fecha: string;
  diaSemana: string;
  facturado: number;
  tickets: number;
  ticketMedio: number;
  efectivo: number;
  tarjeta: number;
  pendiente: number;
  efectivoShare: number;
  tarjetaShare: number;
  mediaDiaSemana: number;
  variacionMedia: number | null;
  ultimaActualizacion: string | null;
}

export function buildDailyTableRows(
  rows: AnalyticsDailyRow[],
  weekdayRows: AnalyticsWeekdayRow[]
): DailyTableRow[] {
  const averages = new Map<number, number>();
  weekdayRows.forEach((row) => {
    averages.set(
      Number(row.dia_semana),
      safeDivide(Number(row.facturado) || 0, Number(row.dias_con_datos) || 0)
    );
  });

  return rows.map((row) => {
    const facturado = Number(row.facturado) || 0;
    const tickets = Number(row.tickets) || 0;
    const efectivo = Number(row.efectivo) || 0;
    const tarjeta = Number(row.tarjeta) || 0;
    const cobrado = efectivo + tarjeta;
    const dia = weekdayISO(row.fecha);
    const media = averages.get(dia) ?? 0;

    return {
      fecha: row.fecha,
      diaSemana: weekdayLabel(dia),
      facturado,
      tickets,
      ticketMedio: safeDivide(facturado, tickets),
      efectivo,
      tarjeta,
      pendiente: Number(row.pendiente) || 0,
      efectivoShare: safeDivide(efectivo, cobrado),
      tarjetaShare: safeDivide(tarjeta, cobrado),
      mediaDiaSemana: media,
      variacionMedia: pctChange(facturado, media),
      ultimaActualizacion: row.ultima_actualizacion,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Comparativas                                                        */
/* ------------------------------------------------------------------ */

export type MetricFormat = "currency" | "number" | "decimal";

export interface ComparisonMetric {
  key: string;
  label: string;
  a: number;
  b: number;
  delta: number;
  deltaPct: number | null;
  format: MetricFormat;
  positiveIsGood: boolean;
}

export function buildComparisonMetrics(
  a: AnalyticsPeriodTotals | null,
  b: AnalyticsPeriodTotals | null
): ComparisonMetric[] {
  const facturadoA = Number(a?.facturado) || 0;
  const facturadoB = Number(b?.facturado) || 0;
  const ticketsA = Number(a?.tickets) || 0;
  const ticketsB = Number(b?.tickets) || 0;
  const diasA = Number(a?.dias_con_datos) || 0;
  const diasB = Number(b?.dias_con_datos) || 0;

  const rows: Array<Omit<ComparisonMetric, "delta" | "deltaPct">> = [
    {
      key: "facturado",
      label: "Facturado",
      a: facturadoA,
      b: facturadoB,
      format: "currency",
      positiveIsGood: true,
    },
    {
      key: "tickets",
      label: "Tickets",
      a: ticketsA,
      b: ticketsB,
      format: "number",
      positiveIsGood: true,
    },
    {
      key: "ticketMedio",
      label: "Ticket medio",
      a: safeDivide(facturadoA, ticketsA),
      b: safeDivide(facturadoB, ticketsB),
      format: "currency",
      positiveIsGood: true,
    },
    {
      key: "efectivo",
      label: "Efectivo",
      a: Number(a?.efectivo) || 0,
      b: Number(b?.efectivo) || 0,
      format: "currency",
      positiveIsGood: true,
    },
    {
      key: "tarjeta",
      label: "Tarjeta",
      a: Number(a?.tarjeta) || 0,
      b: Number(b?.tarjeta) || 0,
      format: "currency",
      positiveIsGood: true,
    },
    {
      key: "pendiente",
      label: "Pendiente",
      a: Number(a?.pendiente) || 0,
      b: Number(b?.pendiente) || 0,
      format: "currency",
      positiveIsGood: false,
    },
    {
      key: "dias",
      label: "Días con actividad",
      a: diasA,
      b: diasB,
      format: "number",
      positiveIsGood: true,
    },
    {
      key: "mediaPorDia",
      label: "Media por día activo",
      a: safeDivide(facturadoA, diasA),
      b: safeDivide(facturadoB, diasB),
      format: "currency",
      positiveIsGood: true,
    },
  ];

  return rows.map((row) => ({
    ...row,
    delta: row.a - row.b,
    deltaPct: pctChange(row.a, row.b),
  }));
}

export interface WeekdayComparisonPoint {
  dia: number;
  label: string;
  a: number;
  b: number;
}

export function buildWeekdayComparison(
  a: AnalyticsWeekdayRow[],
  b: AnalyticsWeekdayRow[]
): WeekdayComparisonPoint[] {
  const averagesA = buildWeekdayAverages(a);
  const averagesB = buildWeekdayAverages(b);
  return averagesA.map((row, index) => ({
    dia: row.dia,
    label: row.label,
    a: row.media,
    b: averagesB[index]?.media ?? 0,
  }));
}

export function buildHourlyComparison(
  currentRows: AnalyticsHourlyRow[],
  previousRows: AnalyticsHourlyRow[]
): Array<{ hora: number; label: string; actual: number; anterior: number }> {
  const current = aggregateByHour(currentRows);
  const previous = aggregateByHour(previousRows);
  return HOUR_ORDER.map((hour) => ({
    hora: hour,
    label: formatHour(hour),
    actual: current.get(hour)?.facturado ?? 0,
    anterior: previous.get(hour)?.facturado ?? 0,
  }));
}

/* ------------------------------------------------------------------ */
/* Calendario y cobertura                                              */
/* ------------------------------------------------------------------ */

export interface CalendarCell {
  fecha: string | null;
  facturado: number;
  tickets: number;
}

export interface CalendarWeeks {
  weeks: CalendarCell[][];
  max: number;
}

export function buildCalendarWeeks(
  year: number,
  rows: AnalyticsDailyRow[]
): CalendarWeeks {
  const byDate = new Map<string, AnalyticsDailyRow>();
  rows.forEach((row) => byDate.set(row.fecha, row));

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const gridStart = startOfWeekISO(yearStart);
  const gridEnd = endOfWeekISO(yearEnd);
  const weeks: CalendarCell[][] = [];
  let max = 0;
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    const week: CalendarCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const fecha = addDays(cursor, index);
      if (fecha < yearStart || fecha > yearEnd) {
        week.push({ fecha: null, facturado: 0, tickets: 0 });
      } else {
        const row = byDate.get(fecha);
        const facturado = Number(row?.facturado) || 0;
        max = Math.max(max, facturado);
        week.push({
          fecha,
          facturado,
          tickets: Number(row?.tickets) || 0,
        });
      }
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return { weeks, max };
}

export function getCoverageRatio(coverage: AnalyticsCoverage | null): number | null {
  if (!coverage || coverage.dias_diarios <= 0) return null;
  return coverage.dias_horarios / coverage.dias_diarios;
}

export function coverageLabel(coverage: AnalyticsCoverage | null): string {
  if (!coverage?.primera_venta || !coverage.ultima_venta) {
    return "Sin datos de ventas";
  }
  const ratio = getCoverageRatio(coverage);
  const horizon = `${formatDateShortEs(coverage.primera_venta)} – ${formatDateShortEs(
    coverage.ultima_venta
  )}`;
  if (ratio === null) return horizon;
  return `${horizon} · cobertura horaria ${formatPercentFromRatio(ratio)}`;
}

export function yearOptions(coverage: AnalyticsCoverage | null): number[] {
  if (!coverage?.primera_venta || !coverage.ultima_venta) return [];
  const first = Number(coverage.primera_venta.slice(0, 4));
  const last = Number(coverage.ultima_venta.slice(0, 4));
  const years: number[] = [];
  for (let year = last; year >= first; year -= 1) years.push(year);
  return years;
}

/** Fechas de un año para el calendario, sin depender del rango seleccionado. */
export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export { eachDate, startOfMonthISO, endOfMonthISO };
