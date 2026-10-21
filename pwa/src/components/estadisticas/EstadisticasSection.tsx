import React, { useState } from "react";
import { ChartColumn, Clock, GitCompareArrows, Loader2, RefreshCw } from "lucide-react";
import { useAnalytics } from "../../hooks/useAnalytics";
import { coverageLabel } from "../../utils/analytics";
import { RangeSelector } from "./RangeSelector";
import { DailyView } from "./DailyView";
import { HourlyView } from "./HourlyView";
import { ComparisonView } from "./ComparisonView";
import { EmptyState } from "./EmptyState";

type SubTab = "day" | "hour" | "compare";

interface EstadisticasSectionProps {
  selectedLocal: string;
  empresaId?: string;
}

const SUB_TABS: Array<{ id: SubTab; label: string; icon: typeof ChartColumn }> = [
  { id: "day", label: "Por día", icon: ChartColumn },
  { id: "hour", label: "Por hora", icon: Clock },
  { id: "compare", label: "Comparativas", icon: GitCompareArrows },
];

export const EstadisticasSection: React.FC<EstadisticasSectionProps> = ({
  selectedLocal,
  empresaId,
}) => {
  const [subTab, setSubTab] = useState<SubTab>("day");
  const analytics = useAnalytics(selectedLocal, empresaId);

  if (analytics.requiresLocal) {
    return (
      <EmptyState
        title="Selecciona un local para ver estadísticas"
        message="Con el acceso por PIN y «Todos los locales» no hay un ámbito de empresa con el que agregar. Elige un local concreto en la cabecera."
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold font-heading text-slate-900 dark:text-white">
            Estadísticas de ventas
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {coverageLabel(analytics.coverage)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-800"
            role="tablist"
            aria-label="Vistas de estadísticas"
          >
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`stats-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`stats-panel-${tab.id}`}
                  onClick={() => setSubTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Recargar estadísticas"
            onClick={analytics.refetch}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400/40 cursor-pointer"
          >
            {analytics.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {subTab !== "compare" ? (
        <RangeSelector
          preset={analytics.preset}
          onPresetChange={analytics.setPreset}
          customFrom={analytics.customFrom}
          customTo={analytics.customTo}
          onCustomChange={(from, to) => {
            const resolvedTo = to || analytics.coverage?.ultima_venta || "";
            const resolvedFrom = from || analytics.coverage?.primera_venta || "";
            analytics.setCustomFrom(resolvedFrom);
            analytics.setCustomTo(resolvedTo);
          }}
          granularity={analytics.granularity}
          onGranularityChange={analytics.setGranularity}
          coverage={analytics.coverage}
          coverageLoading={analytics.coverageLoading}
        />
      ) : null}

      {analytics.error ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300"
        >
          No se pudieron cargar las estadísticas: {analytics.error}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`stats-panel-${subTab}`}
        aria-labelledby={`stats-tab-${subTab}`}
      >
        {subTab === "day" ? (
          <DailyView
            totals={analytics.totals}
            timeseries={analytics.timeseries}
            dailyRows={analytics.dailyRows}
            dailyTotal={analytics.dailyTotal}
            weekdayTotals={analytics.weekdayTotals}
            topDays={analytics.topDays}
            bottomDays={analytics.bottomDays}
            granularity={analytics.granularity}
            page={analytics.page}
            pageSize={analytics.pageSize}
            onPageChange={analytics.setPage}
            loading={analytics.loading}
            coverage={analytics.coverage}
            selectedLocal={selectedLocal}
            empresaId={empresaId}
          />
        ) : null}

        {subTab === "hour" ? (
          <HourlyView
            hourly={analytics.hourly}
            previousHourly={analytics.previousHourly}
            totals={analytics.totals}
            coverage={analytics.coverage}
            range={analytics.range}
          />
        ) : null}

        {subTab === "compare" ? (
          <ComparisonView
            selectedLocal={selectedLocal}
            empresaId={empresaId}
            coverage={analytics.coverage}
          />
        ) : null}
      </div>
    </div>
  );
};
