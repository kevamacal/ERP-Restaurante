import React, { useMemo, useState } from "react";
import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Coins,
  Euro,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type {
  AnalyticsCoverage,
  AnalyticsDailyRow,
  AnalyticsPeriodTotals,
  AnalyticsTimeseriesRow,
  AnalyticsTopDay,
  AnalyticsWeekdayRow,
} from "../../types";
import type { Granularity } from "../../utils/analytics";
import {
  buildCalendarWeeks,
  buildDailyTableRows,
  buildTimeseriesPoints,
  movingAverage,
  safeDivide,
  yearOptions,
} from "../../utils/analytics";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateEs,
  formatNumber,
} from "../../utils/format";
import { useDailyYear } from "../../hooks/useAnalytics";
import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";
import { CalendarHeatmap } from "./CalendarHeatmap";
import { DailyTable } from "./DailyTable";
import { EmptyState } from "./EmptyState";

type DailyMetric = "facturado" | "tickets" | "ticketMedio";

interface DailyViewProps {
  totals: AnalyticsPeriodTotals | null;
  timeseries: AnalyticsTimeseriesRow[];
  dailyRows: AnalyticsDailyRow[];
  dailyTotal: number;
  weekdayTotals: AnalyticsWeekdayRow[];
  topDays: AnalyticsTopDay[];
  bottomDays: AnalyticsTopDay[];
  granularity: Granularity;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  coverage: AnalyticsCoverage | null;
  selectedLocal: string;
  empresaId?: string;
}

const METRIC_LABELS: Record<DailyMetric, string> = {
  facturado: "Facturado",
  tickets: "Tickets",
  ticketMedio: "Ticket medio",
};

export const DailyView: React.FC<DailyViewProps> = ({
  totals,
  timeseries,
  dailyRows,
  dailyTotal,
  weekdayTotals,
  topDays,
  bottomDays,
  granularity,
  page,
  pageSize,
  onPageChange,
  loading,
  coverage,
  selectedLocal,
  empresaId,
}) => {
  const [metric, setMetric] = useState<DailyMetric>("facturado");
  const [calendarYear, setCalendarYear] = useState<number | null>(null);

  const points = useMemo(() => buildTimeseriesPoints(timeseries, granularity), [timeseries, granularity]);
  const tableRows = useMemo(
    () => buildDailyTableRows(dailyRows, weekdayTotals),
    [dailyRows, weekdayTotals]
  );

  const years = useMemo(() => yearOptions(coverage), [coverage]);
  const activeYear =
    calendarYear !== null && years.includes(calendarYear) ? calendarYear : years[0] ?? null;
  const calendar = useDailyYear(selectedLocal, empresaId, activeYear);

  const chartData = useMemo(() => {
    const values = points.map((point) => point[metric]);
    const average = movingAverage(values, granularity === "day" ? 7 : 4);
    return points.map((point, index) => ({
      ...point,
      metricValue: values[index] ?? 0,
      metricAverage: average[index] ?? 0,
    }));
  }, [points, metric, granularity]);

  const calendarWeeks = useMemo(() => {
    if (activeYear === null) return { weeks: [], max: 0 };
    return buildCalendarWeeks(activeYear, calendar.rows);
  }, [activeYear, calendar.rows]);

  const facturado = Number(totals?.facturado) || 0;
  const tickets = Number(totals?.tickets) || 0;
  const dias = Number(totals?.dias_con_datos) || 0;
  const mediaDia = safeDivide(facturado, dias);
  const pendiente = Number(totals?.pendiente) || 0;
  const efectivo = Number(totals?.efectivo) || 0;
  const tarjeta = Number(totals?.tarjeta) || 0;

  const isCurrency = metric !== "tickets";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Facturado" value={formatCurrency(facturado)} icon={Euro} tone="emerald" />
        <StatCard title="Tickets" value={formatNumber(tickets)} icon={Receipt} tone="indigo" />
        <StatCard
          title="Ticket medio"
          value={formatCurrency(safeDivide(facturado, tickets))}
          icon={TrendingUp}
          tone="violet"
        />
        <StatCard
          title="Media/día activo"
          value={formatCurrency(mediaDia)}
          subtitle={`${formatNumber(dias)} días con ventas`}
          icon={CalendarDays}
          tone="cyan"
        />
        <StatCard
          title="Mejor día"
          value={totals?.mejor_fecha ? formatCurrency(totals.mejor_facturado) : "—"}
          subtitle={totals?.mejor_fecha ? formatDateEs(totals.mejor_fecha) : "Sin datos"}
          icon={ArrowUpRight}
          tone="emerald"
        />
        <StatCard
          title="Pendiente"
          value={formatCurrency(pendiente)}
          subtitle="Fuera del facturado"
          icon={Coins}
          tone="amber"
        />
      </div>

      <ChartCard
        title="Evolución de la facturación"
        subtitle={
          granularity === "day"
            ? "Barras por día y media móvil de 7 días"
            : granularity === "week"
              ? "Barras por semana y media móvil de 4 semanas"
              : "Barras por mes y media móvil de 4 meses"
        }
        icon={TrendingUp}
        actions={
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            {(Object.keys(METRIC_LABELS) as DailyMetric[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={metric === value}
                onClick={() => setMetric(value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  metric === value
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {METRIC_LABELS[value]}
              </button>
            ))}
          </div>
        }
      >
        {chartData.length === 0 ? (
          <EmptyState
            title="Sin datos en el rango"
            message="Prueba con otro rango o comprueba que el agente de sincronización ha subido ventas."
          />
        ) : (
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  width={58}
                  tickFormatter={(value: number) =>
                    isCurrency ? formatCurrencyCompact(value) : formatNumber(value)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--chart-tooltip-bg)",
                    borderColor: "var(--chart-tooltip-border)",
                    borderRadius: "0.75rem",
                    color: "var(--chart-text)",
                    fontSize: "12px",
                  }}
                  formatter={(value) =>
                    isCurrency ? formatCurrency(Number(value)) : formatNumber(Number(value))
                  }
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="metricValue"
                  name={METRIC_LABELS[metric]}
                  fill="var(--chart-sales)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  type="monotone"
                  dataKey="metricAverage"
                  name="Media móvil"
                  stroke="var(--chart-sales-alt)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                {chartData.length > 31 ? (
                  <Brush dataKey="label" height={18} stroke="var(--chart-axis)" travellerWidth={6} />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard
          title="Calendario de calor"
          subtitle="Facturación diaria del año seleccionado"
          icon={CalendarDays}
          className="xl:col-span-2"
        >
          <CalendarHeatmap
            year={activeYear}
            years={years}
            onYearChange={setCalendarYear}
            weeks={calendarWeeks.weeks}
            max={calendarWeeks.max}
            loading={calendar.loading}
            error={calendar.error}
          />
        </ChartCard>

        <div className="space-y-3">
          <ChartCard title="Mejores días" subtitle="Con al menos un ticket" icon={ArrowUpRight}>
            <DayRanking days={topDays} tone="emerald" empty="Sin datos" />
          </ChartCard>
          <ChartCard title="Días más flojos" subtitle="Con al menos un ticket" icon={ArrowDownRight}>
            <DayRanking days={bottomDays} tone="rose" empty="Sin datos" />
          </ChartCard>
        </div>
      </div>

      <ChartCard
        title="Detalle diario"
        subtitle="Facturación, cobros y pendiente día a día"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> {formatCurrency(efectivo)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> {formatCurrency(tarjeta)}
            </span>
          </div>
        }
      >
        <DailyTable
          rows={tableRows}
          page={page}
          pageSize={pageSize}
          total={dailyTotal}
          loading={loading}
          onPageChange={onPageChange}
        />
      </ChartCard>
    </div>
  );
};

interface DayRankingProps {
  days: AnalyticsTopDay[];
  tone: "emerald" | "rose";
  empty: string;
}

const DayRanking: React.FC<DayRankingProps> = ({ days, tone, empty }) => {
  if (days.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{empty}</p>;
  }

  const amountClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <ul className="space-y-1.5">
      {days.map((day) => (
        <li key={day.fecha} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {formatDateEs(day.fecha)}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400 font-mono">{formatNumber(day.tickets)} tk</span>
            <span className={`font-mono font-bold ${amountClass}`}>
              {formatCurrency(day.facturado)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};


