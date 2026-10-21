import React from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import type { AnalyticsCoverage } from "../../types";
import type { Granularity, RangePreset } from "../../utils/analytics";
import { coverageLabel } from "../../utils/analytics";

interface RangeSelectorProps {
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
  coverage: AnalyticsCoverage | null;
  coverageLoading: boolean;
}

const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "month", label: "Este mes" },
  { value: "prev-month", label: "Mes anterior" },
  { value: "year", label: "Este año" },
  { value: "prev-year", label: "Año anterior" },
  { value: "all", label: "Todo" },
];

const GRANULARITIES: Array<{ value: Granularity; label: string }> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export const RangeSelector: React.FC<RangeSelectorProps> = ({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomChange,
  granularity,
  onGranularityChange,
  coverage,
  coverageLoading,
}) => {
  return (
    <section className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <CalendarRange className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span>Rango de análisis</span>
          {coverageLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Cargando cobertura" />
          ) : (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {coverageLabel(coverage)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Agrupar
          </span>
          <div
            className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800"
            role="group"
            aria-label="Agrupación temporal"
          >
            {GRANULARITIES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={granularity === item.value}
                onClick={() => onGranularityChange(item.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  granularity === item.value
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((item) => {
          const isDisabled = item.value === "all" && !coverage?.primera_venta;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={preset === item.value}
              disabled={isDisabled}
              onClick={() => onPresetChange(item.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                preset === item.value
                  ? "bg-indigo-600 border-indigo-500 text-white shadow"
                  : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400/40"
              }`}
            >
              {item.label}
            </button>
          );
        })}

        <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
          <label htmlFor="stats-range-from" className="sr-only">
            Desde
          </label>
          <input
            id="stats-range-from"
            type="date"
            value={customFrom}
            min={coverage?.primera_venta ?? undefined}
            max={coverage?.ultima_venta ?? undefined}
            onChange={(event) => {
              onCustomChange(event.target.value, customTo);
              onPresetChange("custom");
            }}
            className="px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          />
          <span className="text-slate-400 text-xs">–</span>
          <label htmlFor="stats-range-to" className="sr-only">
            Hasta
          </label>
          <input
            id="stats-range-to"
            type="date"
            value={customTo}
            min={coverage?.primera_venta ?? undefined}
            max={coverage?.ultima_venta ?? undefined}
            onChange={(event) => {
              onCustomChange(customFrom, event.target.value);
              onPresetChange("custom");
            }}
            className="px-2 py-1.5 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>
    </section>
  );
};
