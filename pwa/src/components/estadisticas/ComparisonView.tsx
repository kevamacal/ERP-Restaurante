import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarRange, GitCompareArrows, TrendingUp } from "lucide-react";
import type { AnalyticsCoverage } from "../../types";
import type { ComparisonPeriod } from "../../hooks/useAnalytics";
import { usePeriodComparison } from "../../hooks/useAnalytics";
import type { ComparisonMetric, MetricFormat } from "../../utils/analytics";
import {
  buildComparisonMetrics,
  buildTimeseriesPoints,
  buildWeekdayComparison,
  pctChange,
} from "../../utils/analytics";
import {
  addDays,
  addMonths,
  clampEnd,
  differenceInDays,
  endOfMonthISO,
  endOfWeekISO,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
} from "../../utils/periods";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateEs,
  formatDecimal,
  formatNumber,
  formatSignedCurrency,
  formatSignedPercentFromRatio,
} from "../../utils/format";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";
import { StatCard } from "./StatCard";

type ComparisonMode = "week" | "month";

interface ComparisonViewProps {
  selectedLocal: string;
  empresaId?: string;
  coverage: AnalyticsCoverage | null;
}

function formatMetricValue(value: number, format: MetricFormat): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "decimal") return formatDecimal(value);
  return formatNumber(value);
}

function formatSignedValue(value: number, format: MetricFormat): string {
  if (format === "currency") return formatSignedCurrency(value);
  const text = format === "decimal" ? formatDecimal(Math.abs(value)) : formatNumber(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${text}`;
}

const ComparisonMetricCard: React.FC<{ metric: ComparisonMetric; labelA: string; labelB: string }> = ({
  metric,
  labelA,
  labelB,
}) => {
  const isPositive = metric.delta > 0;
  const isNeutral = metric.delta === 0;
  const isGood = isNeutral ? null : isPositive === metric.positiveIsGood;
  const deltaClass = isGood === null
    ? "text-slate-500 dark:text-slate-400"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  const Icon = isNeutral ? GitCompareArrows : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {metric.label}
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${deltaClass}`} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white">
          {formatMetricValue(metric.a, metric.format)}
        </span>
        <span className={`text-[11px] font-mono font-bold ${deltaClass}`}>
          {formatSignedPercentFromRatio(metric.deltaPct)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="truncate">{labelA}</span>
        <span className="truncate text-right">{labelB}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono">
        <span className="text-slate-600 dark:text-slate-300">{formatMetricValue(metric.a, metric.format)}</span>
        <span className={deltaClass}>{formatSignedValue(metric.delta, metric.format)}</span>
        <span className="text-slate-500 dark:text-slate-400">{formatMetricValue(metric.b, metric.format)}</span>
      </div>
    </div>
  );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  selectedLocal,
  empresaId,
  coverage,
}) => {
  const anchor = coverage?.ultima_venta ?? todayISO();
  const [mode, setMode] = useState<ComparisonMode>("week");
  const [aStart, setAStart] = useState<string>(() => startOfWeekISO(anchor));
  const [bStart, setBStart] = useState<string>(() => startOfWeekISO(addDays(anchor, -7)));
  const [sameElapsed, setSameElapsed] = useState<boolean>(true);

  useEffect(() => {
    const base = coverage?.ultima_venta;
    if (!base) return;
    if (mode === "week") {
      setAStart(startOfWeekISO(base));
      setBStart(startOfWeekISO(addDays(base, -7)));
    } else {
      setAStart(startOfMonthISO(base));
      setBStart(startOfMonthISO(addMonths(base, -1)));
    }
  }, [mode, coverage?.ultima_venta]);

  const periodA = useMemo<ComparisonPeriod>(() => {
    if (mode === "week") {
      const from = startOfWeekISO(aStart);
      const naturalEnd = endOfWeekISO(from);
      return { from, to: from > anchor ? naturalEnd : clampEnd(from, naturalEnd, anchor) };
    }
    const from = startOfMonthISO(aStart);
    const naturalEnd = endOfMonthISO(from);
    return { from, to: from > anchor ? naturalEnd : clampEnd(from, naturalEnd, anchor) };
  }, [mode, aStart, anchor]);

  const naturalEndA = mode === "week" ? endOfWeekISO(periodA.from) : endOfMonthISO(periodA.from);
  const partialA = periodA.to < naturalEndA;

  const periodB = useMemo<ComparisonPeriod>(() => {
    const from = mode === "week" ? startOfWeekISO(bStart) : startOfMonthISO(bStart);
    const naturalEnd = mode === "week" ? endOfWeekISO(from) : endOfMonthISO(from);
    if (sameElapsed && partialA) {
      const elapsed = differenceInDays(periodA.from, periodA.to);
      return { from, to: clampEnd(from, addDays(from, elapsed), naturalEnd) };
    }
    return { from, to: naturalEnd };
  }, [mode, bStart, sameElapsed, partialA, periodA]);

  const comparison = usePeriodComparison(selectedLocal, empresaId, mode, periodA, periodB);
  const metrics = useMemo(
    () => buildComparisonMetrics(comparison.totalsA, comparison.totalsB),
    [comparison.totalsA, comparison.totalsB]
  );
  const weekdayData = useMemo(
    () => buildWeekdayComparison(comparison.weekdayA, comparison.weekdayB),
    [comparison.weekdayA, comparison.weekdayB]
  );
  const trendData = useMemo(
    () =>
      buildTimeseriesPoints(comparison.trend, mode === "week" ? "week" : "month").map((point) => ({
        label: point.label,
        facturado: point.facturado,
      })),
    [comparison.trend, mode]
  );

  const labelA = `${formatDateEs(periodA.from)} – ${formatDateEs(periodA.to)}`;
  const labelB = `${formatDateEs(periodB.from)} – ${formatDateEs(periodB.to)}`;
  const facturadoA = Number(comparison.totalsA?.facturado) || 0;
  const facturadoB = Number(comparison.totalsB?.facturado) || 0;
  const globalChange = pctChange(facturadoA, facturadoB);

  const setPreviousB = () => {
    if (mode === "week") {
      setBStart(startOfWeekISO(addDays(periodA.from, -7)));
    } else {
      setBStart(startOfMonthISO(addMonths(periodA.from, -1)));
    }
  };

  const setSamePeriodLastYear = () => {
    if (mode === "week") {
      setBStart(startOfWeekISO(addDays(periodA.from, -364)));
    } else {
      setBStart(startOfMonthISO(addMonths(periodA.from, -12)));
    }
  };

  const swapPeriods = () => {
    const previousA = aStart;
    setAStart(bStart);
    setBStart(previousA);
  };

  const hasData =
    (comparison.totalsA?.dias_con_datos ?? 0) > 0 || (comparison.totalsB?.dias_con_datos ?? 0) > 0;

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Comparar periodos</span>
          </div>

          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 self-start">
            <button
              type="button"
              aria-pressed={mode === "week"}
              onClick={() => setMode("week")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                mode === "week" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Semanas
            </button>
            <button
              type="button"
              aria-pressed={mode === "month"}
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                mode === "month" ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Meses
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3">
            <label htmlFor="comparison-a" className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">
              Periodo A (actual)
            </label>
            {mode === "week" ? (
              <input
                id="comparison-a"
                type="date"
                value={periodA.from}
                max={anchor}
                onChange={(event) => setAStart(startOfWeekISO(event.target.value))}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            ) : (
              <input
                id="comparison-a"
                type="month"
                value={periodA.from.slice(0, 7)}
                max={anchor.slice(0, 7)}
                onChange={(event) => setAStart(`${event.target.value}-01`)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            )}
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{labelA}</p>
          </div>

          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-500/5 p-3">
            <label htmlFor="comparison-b" className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Periodo B (comparación)
            </label>
            {mode === "week" ? (
              <input
                id="comparison-b"
                type="date"
                value={periodB.from}
                max={anchor}
                onChange={(event) => setBStart(startOfWeekISO(event.target.value))}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            ) : (
              <input
                id="comparison-b"
                type="month"
                value={periodB.from.slice(0, 7)}
                max={anchor.slice(0, 7)}
                onChange={(event) => setBStart(`${event.target.value}-01`)}
                className="w-full px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            )}
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{labelB}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={setPreviousB}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            B = periodo anterior
          </button>
          <button
            type="button"
            onClick={setSamePeriodLastYear}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            B = mismo periodo del año pasado
          </button>
          <button
            type="button"
            onClick={swapPeriods}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Intercambiar A/B
          </button>

          {partialA ? (
            <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sameElapsed}
                onChange={(event) => setSameElapsed(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700"
              />
              Comparar mismo tramo
            </label>
          ) : null}
        </div>

        {partialA ? (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            El periodo A está en curso. {sameElapsed ? "El periodo B se recorta a los mismos días transcurridos." : "Se compara el periodo B completo, aunque tenga más días."}
          </p>
        ) : null}
      </section>

      {comparison.error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
          No se pudo cargar la comparativa: {comparison.error}
        </div>
      ) : null}

      {!hasData && !comparison.loading ? (
        <EmptyState
          title="Sin datos para comparar"
          message="Alguno de los periodos no tiene ventas. Prueba con otras fechas o revisa la cobertura histórica."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard
              title="Facturado A"
              value={formatCurrency(facturadoA)}
              subtitle={labelA}
              icon={ArrowUpRight}
              tone="emerald"
            />
            <StatCard
              title="Facturado B"
              value={formatCurrency(facturadoB)}
              subtitle={labelB}
              icon={ArrowDownRight}
              tone="slate"
            />
            <StatCard
              title="Variación"
              value={formatSignedPercentFromRatio(globalChange)}
              subtitle="Facturado A vs B"
              icon={TrendingUp}
              tone={globalChange !== null && globalChange >= 0 ? "emerald" : "amber"}
            />
            <StatCard
              title="Diferencia"
              value={formatSignedCurrency(facturadoA - facturadoB)}
              subtitle="Importe absoluto"
              icon={GitCompareArrows}
              tone={facturadoA >= facturadoB ? "emerald" : "amber"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <ComparisonMetricCard key={metric.key} metric={metric} labelA="A" labelB="B" />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartCard
              title="Media por día de la semana"
              subtitle="Compara el mismo día entre los dos periodos"
              icon={CalendarRange}
            >
              {weekdayData.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Sin datos.</p>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis
                        stroke="var(--chart-axis)"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        width={56}
                        tickFormatter={(value: number) => formatCurrencyCompact(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--chart-tooltip-bg)",
                          borderColor: "var(--chart-tooltip-border)",
                          borderRadius: "0.75rem",
                          color: "var(--chart-text)",
                          fontSize: "12px",
                        }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="a" name="Periodo A" fill="var(--chart-sales)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="b" name="Periodo B" fill="var(--chart-sales-alt)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Tendencia"
              subtitle={mode === "week" ? "Últimas 12 semanas" : "Últimos 12 meses"}
              icon={TrendingUp}
            >
              {trendData.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Sin datos.</p>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="var(--chart-axis)"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                      />
                      <YAxis
                        stroke="var(--chart-axis)"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        width={56}
                        tickFormatter={(value: number) => formatCurrencyCompact(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--chart-tooltip-bg)",
                          borderColor: "var(--chart-tooltip-border)",
                          borderRadius: "0.75rem",
                          color: "var(--chart-text)",
                          fontSize: "12px",
                        }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Line
                        type="monotone"
                        dataKey="facturado"
                        name="Facturado"
                        stroke="var(--chart-sales)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Detalle de la comparación" subtitle="Periodo A frente a periodo B" icon={GitCompareArrows}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left border-collapse text-[11px]">
                <caption className="sr-only">Métricas comparadas entre el periodo A y el periodo B</caption>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th scope="col" className="py-2 px-2">Métrica</th>
                    <th scope="col" className="py-2 px-2 text-right">Periodo A</th>
                    <th scope="col" className="py-2 px-2 text-right">Periodo B</th>
                    <th scope="col" className="py-2 px-2 text-right">Diferencia</th>
                    <th scope="col" className="py-2 px-2 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
                  {metrics.map((metric) => {
                    const good = metric.delta === 0 ? null : (metric.delta > 0) === metric.positiveIsGood;
                    const cls =
                      good === null
                        ? "text-slate-500 dark:text-slate-400"
                        : good
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400";
                    return (
                      <tr key={metric.key}>
                        <th scope="row" className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-200">
                          {metric.label}
                        </th>
                        <td className="py-2 px-2 text-right font-mono">{formatMetricValue(metric.a, metric.format)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatMetricValue(metric.b, metric.format)}</td>
                        <td className={`py-2 px-2 text-right font-mono ${cls}`}>
                          {formatSignedValue(metric.delta, metric.format)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${cls}`}>
                          {formatSignedPercentFromRatio(metric.deltaPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
};
