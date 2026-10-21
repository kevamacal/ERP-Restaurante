import React from "react";
import type { HeatmapCell } from "../../utils/analytics";
import { HEATMAP_HOUR_ORDER, weekdayLongLabel } from "../../utils/periods";
import { formatCurrency, formatCurrencyCompact, formatHour, formatNumber } from "../../utils/format";

export type HeatmapMode = "media" | "total";

interface WeekdayHourHeatmapProps {
  cells: HeatmapCell[];
  maxMedia: number;
  maxTotal: number;
  mode: HeatmapMode;
  onModeChange: (mode: HeatmapMode) => void;
}

export const WeekdayHourHeatmap: React.FC<WeekdayHourHeatmapProps> = ({
  cells,
  maxMedia,
  maxTotal,
  mode,
  onModeChange,
}) => {
  const byKey = new Map(cells.map((cell) => [`${cell.dia}-${cell.hora}`, cell]));
  const max = mode === "media" ? maxMedia : maxTotal;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-pressed={mode === "media"}
          onClick={() => onModeChange("media")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
            mode === "media"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          Media por día
        </button>
        <button
          type="button"
          aria-pressed={mode === "total"}
          onClick={() => onModeChange("total")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
            mode === "total"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          Total
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0.5 text-[10px]">
          <caption className="sr-only">
            Facturación por día de la semana y hora. {mode === "media" ? "Media por día" : "Total del periodo"}.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur px-2 py-1 text-left text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Día
              </th>
              {HEATMAP_HOUR_ORDER.map((hour) => (
                <th
                  key={hour}
                  scope="col"
                  className="px-1 py-1 text-center font-mono font-semibold text-slate-500 dark:text-slate-400"
                >
                  {String(hour).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((dia) => (
              <tr key={dia}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur px-2 py-1 text-left text-[10px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                >
                  {weekdayLongLabel(dia)}
                </th>
                {HEATMAP_HOUR_ORDER.map((hour) => {
                  const cell = byKey.get(`${dia}-${hour}`);
                  const value = mode === "media" ? cell?.media ?? 0 : cell?.facturado ?? 0;
                  const ratio = max > 0 ? value / max : 0;
                  const opacity = value > 0 ? 0.12 + ratio * 0.88 : 0;
                  const label = `${weekdayLongLabel(dia)} ${formatHour(hour)}: ${formatCurrency(
                    cell?.facturado ?? 0
                  )} en ${formatNumber(cell?.dias ?? 0)} días · media ${formatCurrency(
                    cell?.media ?? 0
                  )}`;

                  return (
                    <td key={hour} className="p-0">
                      <div
                        role="img"
                        aria-label={label}
                        title={label}
                        className="relative h-7 min-w-[26px] rounded-[4px] border border-slate-200/50 dark:border-slate-800/60 overflow-hidden"
                      >
                        <span
                          className="absolute inset-0"
                          style={{ backgroundColor: "var(--chart-sales)", opacity }}
                          aria-hidden="true"
                        />
                        <span className="relative z-10 h-full flex items-center justify-center font-mono text-[9px] font-bold text-slate-800 dark:text-white">
                          {value > 0 ? formatCurrencyCompact(value) : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        La media divide por las veces que cae ese día de la semana en el rango. Los días cerrados cuentan como 0.
        El desglose horario excluye tickets pendientes.
      </p>
    </div>
  );
};
