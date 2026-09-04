import React from "react";
import { Coins } from "lucide-react";

interface WeeklyPaymentsTableProps {
  weeklyPaymentsData: {
    mondayDate: Date;
    sundayDate: Date;
    list: Array<{ id: string; name: string; hours: number; rate: number; total: number }>;
    grandTotal: number;
  };
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}

export const WeeklyPaymentsTable: React.FC<WeeklyPaymentsTableProps> = ({
  weeklyPaymentsData,
  weekOffset,
  setWeekOffset,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Coins className="h-4 w-4" /> Pagos Semanales
        </h4>
        <div className="flex items-center bg-slate-200 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-300 dark:border-slate-800 text-[10px]">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors cursor-pointer"
          >
            &lt;
          </button>
          <span className="px-2 text-slate-700 dark:text-slate-300 font-semibold">
            {weekOffset === 0
              ? "Esta Sem."
              : weekOffset === -1
                ? "Sem. Pasada"
                : `S${weekOffset}`}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
            className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors disabled:opacity-30 cursor-pointer"
            disabled={weekOffset === 0}
          >
            &gt;
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
        Rango:{" "}
        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
          {weeklyPaymentsData.mondayDate.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>{" "}
        al{" "}
        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
          {weeklyPaymentsData.sundayDate.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </p>

      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 divide-y divide-slate-200 dark:divide-slate-800/50">
        {weeklyPaymentsData.list.length > 0 ? (
          weeklyPaymentsData.list.map((emp) => (
            <div
              key={emp.id}
              className="pt-2 flex items-center justify-between text-xs font-semibold"
            >
              <div>
                <span className="text-slate-800 dark:text-slate-200 font-bold block">
                  {emp.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {emp.hours.toFixed(1)}h × {emp.rate.toFixed(1)}€
                </span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-right">
                {emp.total.toFixed(2)} €
              </span>
            </div>
          ))
        ) : (
          <p className="text-center py-4 text-slate-500 text-[10px]">
            Sin horas trabajadas esta semana.
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold font-mono">
        <span>Total Liquidación</span>
        <span className="font-bold text-emerald-400 text-sm font-mono">
          {weeklyPaymentsData.grandTotal.toFixed(2)} €
        </span>
      </div>
    </div>
  );
};
