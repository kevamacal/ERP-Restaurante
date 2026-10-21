import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartColumn, Clock, Coins, Flame, Layers, TrendingUp } from "lucide-react";
import type { AnalyticsCoverage, AnalyticsHourlyRow, AnalyticsPeriodTotals } from "../../types";
import type { ResolvedRange } from "../../utils/analytics";
import {
  buildHeatmap,
  buildHourlyComparison,
  buildHourlySummary,
  safeDivide,
} from "../../utils/analytics";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateEs,
  formatHour,
  formatNumber,
  formatPercentFromRatio,
} from "../../utils/format";
import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";
import { WeekdayHourHeatmap, type HeatmapMode } from "./WeekdayHourHeatmap";

type ProfileMode = "total" | "media";

interface HourlyViewProps {
  hourly: AnalyticsHourlyRow[];
  previousHourly: AnalyticsHourlyRow[];
  totals: AnalyticsPeriodTotals | null;
  coverage: AnalyticsCoverage | null;
  range: ResolvedRange | null;
}

export const HourlyView: React.FC<HourlyViewProps> = ({
  hourly,
  previousHourly,
  totals,
  coverage,
  range,
}) => {
  const [profileMode, setProfileMode] = useState<ProfileMode>("total");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("media");

  const summary = useMemo(() => buildHourlySummary(hourly), [hourly]);
  const heatmap = useMemo(
    () => (range ? buildHeatmap(hourly, range.from, range.to) : { cells: [], maxMedia: 0, maxTotal: 0 }),
    [hourly, range]
  );
  const comparison = useMemo(
    () => buildHourlyComparison(hourly, previousHourly),
    [hourly, previousHourly]
  );

  const peakBand = useMemo(
    () =>
      summary.bands.reduce(
        (best, band) => (band.facturado > best.facturado ? band : best),
        summary.bands[0]
      ),
    [summary.bands]
  );

  const diasConDatos = Number(totals?.dias_con_datos) || 0;
  const diasHorarios = Number(totals?.dias_horarios) || 0;
  const cobertura = safeDivide(diasHorarios, diasConDatos);
  const hasHourly = hourly.length > 0 && summary.totalFacturado > 0;

  const chartData = summary.points.map((point) => ({
    ...point,
    acumuladoPct: point.cumulativeShare,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          title="Hora punta"
          value={summary.peakHour === null ? "—" : formatHour(summary.peakHour)}
          subtitle={summary.peakHour === null ? "Sin datos" : formatCurrency(summary.peakFacturado)}
          icon={Flame}
          tone="amber"
        />
        <StatCard
          title="Franja punta"
          value={peakBand ? peakBand.label.split(" (")[0] : "—"}
          subtitle={peakBand ? formatPercentFromRatio(peakBand.share) : "Sin datos"}
          icon={Clock}
          tone="indigo"
        />
        <StatCard
          title="Top 3 horas"
          value={formatPercentFromRatio(summary.top3Share)}
          subtitle="De la facturación total"
          icon={Coins}
          tone="emerald"
        />
        <StatCard
          title="Ticket medio punta"
          value={formatCurrency(summary.peakTicketMedio)}
          subtitle={summary.peakHour === null ? "Sin datos" : formatHour(summary.peakHour)}
          icon={TrendingUp}
          tone="violet"
        />
        <StatCard
          title="Facturado horario"
          value={formatCurrency(summary.totalFacturado)}
          subtitle={`${formatNumber(summary.totalTickets)} tickets`}
          icon={ChartColumn}
          tone="cyan"
        />
        <StatCard
          title="Cobertura horaria"
          value={formatPercentFromRatio(cobertura)}
          subtitle={`${formatNumber(diasHorarios)} de ${formatNumber(diasConDatos)} días`}
          icon={Layers}
          tone={cobertura < 0.95 ? "amber" : "slate"}
        />
      </div>

      {coverage?.primera_hora && range && coverage.primera_hora > range.from ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
          El desglose horario empieza el {formatDateEs(coverage.primera_hora)}. Las fechas anteriores solo
          tienen total diario.
        </div>
      ) : null}

      {!hasHourly ? (
        <EmptyState
          title="No hay desglose horario en este rango"
          message={
            coverage?.primera_hora
              ? `Hay datos horarios desde ${formatDateEs(coverage.primera_hora)}. Prueba un rango que incluya esa fecha.`
              : "El agente todavía no ha subido ventas por hora para este local."
          }
        />
      ) : (
        <>
          <ChartCard
            title="Perfil horario"
            subtitle="A qué horas se concentra la facturación"
            icon={ChartColumn}
            actions={
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  aria-pressed={profileMode === "total"}
                  onClick={() => setProfileMode("total")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    profileMode === "total"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Total
                </button>
                <button
                  type="button"
                  aria-pressed={profileMode === "media"}
                  onClick={() => setProfileMode("media")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    profileMode === "media"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Media por día
                </button>
              </div>
            }
          >
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--chart-axis)"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--chart-axis)"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    width={56}
                    tickFormatter={(value: number) => formatCurrencyCompact(value)}
                  />
                  {profileMode === "total" ? (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--chart-axis)"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      width={42}
                      domain={[0, 1]}
                      tickFormatter={(value: number) => formatPercentFromRatio(value)}
                    />
                  ) : null}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--chart-tooltip-bg)",
                      borderColor: "var(--chart-tooltip-border)",
                      borderRadius: "0.75rem",
                      color: "var(--chart-text)",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) =>
                      String(name).toLowerCase().includes("acumulado")
                        ? formatPercentFromRatio(Number(value))
                        : formatCurrency(Number(value))
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey={profileMode === "total" ? "facturado" : "mediaPorDia"}
                    name={profileMode === "total" ? "Facturado" : "Media por día"}
                    fill="var(--chart-sales)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  {profileMode === "total" ? (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="acumuladoPct"
                      name="% acumulado"
                      stroke="var(--chart-sales-alt)"
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ChartCard
              title="Mapa de calor: día y hora"
              subtitle="La media divide por las veces que cae cada día en el rango"
              icon={Flame}
              className="xl:col-span-2"
            >
              <WeekdayHourHeatmap
                cells={heatmap.cells}
                maxMedia={heatmap.maxMedia}
                maxTotal={heatmap.maxTotal}
                mode={heatmapMode}
                onModeChange={setHeatmapMode}
              />
            </ChartCard>

            <ChartCard title="Por franjas" subtitle="Reparto del día comercial" icon={Layers}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <caption className="sr-only">Facturación por franja horaria</caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th scope="col" className="py-2 pr-2">Franja</th>
                      <th scope="col" className="py-2 px-2 text-right">Facturado</th>
                      <th scope="col" className="py-2 px-2 text-right">%</th>
                      <th scope="col" className="py-2 pl-2 text-right">Tickets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
                    {summary.bands
                      .filter((band) => band.id !== "sin-servicio" || band.facturado > 0)
                      .map((band) => (
                        <tr key={band.id}>
                          <th scope="row" className="py-2 pr-2 font-semibold text-slate-700 dark:text-slate-200">
                            <span className="block">{band.label}</span>
                            <span className="mt-1 block h-1.5 w-full max-w-[110px] rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <span
                                className="block h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(100, band.share * 100)}%` }}
                              />
                            </span>
                          </th>
                          <td className="py-2 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(band.facturado)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {formatPercentFromRatio(band.share)}
                          </td>
                          <td className="py-2 pl-2 text-right font-mono">{formatNumber(band.tickets)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {previousHourly.length > 0 ? (
            <ChartCard
              title="Actual vs periodo anterior"
              subtitle="Mismo rango de días, inmediatamente anterior"
              icon={TrendingUp}
            >
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--chart-axis)"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      interval={1}
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
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="actual" name="Periodo actual" fill="var(--chart-sales)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="anterior" name="Periodo anterior" fill="var(--chart-sales-alt)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          ) : null}

          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Las horas excluyen tickets pendientes, igual que la tabla original. Por eso la suma horaria puede no
            coincidir con el total diario cuando hay pendiente.
          </p>
        </>
      )}
    </div>
  );
};
