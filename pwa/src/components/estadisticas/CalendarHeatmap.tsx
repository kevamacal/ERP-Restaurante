import React from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import type { CalendarCell } from "../../utils/analytics";
import { formatCurrency, formatDateLongEs, formatNumber } from "../../utils/format";

interface CalendarHeatmapProps {
  year: number | null;
  years: number[];
  onYearChange: (year: number) => void;
  weeks: CalendarCell[][];
  max: number;
  loading: boolean;
  error: string | null;
}

const WEEKDAY_MARKS = ["Lun", "", "Mié", "", "Vie", "", "Dom"];

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  year,
  years,
  onYearChange,
  weeks,
  max,
  loading,
  error,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>Calendario de facturación</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="stats-calendar-year" className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Año
          </label>
          <select
            id="stats-calendar-year"
            value={year ?? ""}
            onChange={(event) => onYearChange(Number(event.target.value))}
            disabled={years.length === 0}
            className="px-2 py-1 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando calendario…
        </div>
      ) : weeks.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
          No hay días con ventas en este año.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="grid grid-rows-7 gap-1 shrink-0 pt-0.5">
            {WEEKDAY_MARKS.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="h-3 sm:h-3.5 text-[8px] sm:text-[9px] leading-3 sm:leading-3.5 text-slate-400 dark:text-slate-500 font-semibold"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                {week.map((cell, dayIndex) => {
                  if (!cell.fecha) {
                    return (
                      <span
                        key={`empty-${weekIndex}-${dayIndex}`}
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                        aria-hidden="true"
                      />
                    );
                  }

                  const ratio = max > 0 ? cell.facturado / max : 0;
                  const opacity = cell.facturado > 0 ? 0.15 + ratio * 0.85 : 0.08;
                  const label = `${formatDateLongEs(cell.fecha)}: ${formatCurrency(
                    cell.facturado
                  )}, ${formatNumber(cell.tickets)} tickets`;

                  return (
                    <span
                      key={cell.fecha}
                      role="img"
                      aria-label={label}
                      title={label}
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-[3px] border border-slate-200/60 dark:border-slate-800/60"
                      style={{
                        backgroundColor:
                          cell.facturado > 0 ? "var(--chart-sales)" : "var(--chart-grid)",
                        opacity,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 text-[9px] text-slate-500 dark:text-slate-400">
        <span>Menos</span>
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((opacity) => (
          <span
            key={opacity}
            className="h-2.5 w-2.5 rounded-[2px] border border-slate-200/60 dark:border-slate-800/60"
            style={{ backgroundColor: "var(--chart-sales)", opacity }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
};
