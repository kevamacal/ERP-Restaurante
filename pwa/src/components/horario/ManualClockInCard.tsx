import React from "react";
import type { Empleado } from "../../types";
import { Clock } from "lucide-react";

interface ManualClockInCardProps {
  adminEmployees: Empleado[];
  manualEmpId: string;
  setManualEmpId: (val: string) => void;
  manualTipo: "entrada" | "salida";
  setManualTipo: (val: "entrada" | "salida") => void;
  manualFechaHora: string;
  setManualFechaHora: (val: string) => void;
  handleAddManualFichaje: () => void;
}

export const ManualClockInCard: React.FC<ManualClockInCardProps> = ({
  adminEmployees,
  manualEmpId,
  setManualEmpId,
  manualTipo,
  setManualTipo,
  manualFechaHora,
  setManualFechaHora,
  handleAddManualFichaje,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
        <Clock className="h-4 w-4" /> Registrar Fichaje Manual
      </h4>
      <div className="space-y-3">
        <div className="space-y-1">
          <label
            htmlFor="manualEmpSelect"
            className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
          >
            Empleado
          </label>
          <select
            id="manualEmpSelect"
            value={manualEmpId}
            onChange={(e) => setManualEmpId(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
          >
            <option value="">Selecciona un empleado...</option>
            {adminEmployees
              .filter((e) => e.activo)
              .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Tipo de Evento
          </label>
          <div className="flex bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setManualTipo("entrada")}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                manualTipo === "entrada"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setManualTipo("salida")}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                manualTipo === "salida"
                  ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Salida
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="manualFechaHoraInput"
            className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
          >
            Fecha y Hora
          </label>
          <input
            id="manualFechaHoraInput"
            type="datetime-local"
            value={manualFechaHora}
            onChange={(e) => setManualFechaHora(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleAddManualFichaje}
          disabled={!manualEmpId || !manualFechaHora}
          className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
        >
          Registrar Fichaje
        </button>
      </div>
    </div>
  );
};
