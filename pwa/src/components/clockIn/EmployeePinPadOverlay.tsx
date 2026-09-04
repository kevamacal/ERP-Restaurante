import React from "react";
import type { Empleado } from "../../types";
import { ShieldCheck, ArrowRight, Delete } from "lucide-react";

interface EmployeePinPadOverlayProps {
  selectedEmployee: Empleado;
  pinIsCorrect: boolean;
  pinError: boolean;
  employeePin: string;
  loading: boolean;
  handleKeypadPress: (num: string) => void;
  handleKeypadDelete: () => void;
  handleFichar: (tipo: "entrada" | "salida") => void;
  onCancel: () => void;
}

export const EmployeePinPadOverlay: React.FC<EmployeePinPadOverlayProps> = ({
  selectedEmployee,
  pinIsCorrect,
  pinError,
  employeePin,
  loading,
  handleKeypadPress,
  handleKeypadDelete,
  handleFichar,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-sm w-full p-6 sm:p-8 rounded-3xl border border-slate-800/80 flex flex-col items-center relative shadow-2xl">
        {/* Header / Hello text */}
        <div className="text-center w-full mb-6">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
            Fichaje de Jornada
          </span>
          <h3 className="text-xl font-extrabold font-heading text-white truncate px-2">
            Hola, {selectedEmployee.nombre} 👋
          </h3>
        </div>

        {!pinIsCorrect ? (
          /* KEYPAD FOR PIN ENTRY */
          <div className="w-full flex flex-col items-center">
            <p className="text-xs text-slate-400 mb-5 text-center">
              Introduce tu PIN para continuar
            </p>

            {/* 4 dots showing PIN input progress */}
            <div
              className={`flex gap-4 mb-8 ${pinError ? "animate-shake" : ""}`}
            >
              {[0, 1, 2, 3].map((idx) => {
                let indicatorClass = "border-slate-800 bg-slate-900";
                if (pinError) {
                  indicatorClass =
                    "border-rose-500 bg-rose-500/40 animate-pulse";
                } else if (idx < employeePin.length) {
                  indicatorClass =
                    "border-indigo-400 bg-indigo-500 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.5)]";
                }
                return (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full border transition-all duration-150 ${indicatorClass}`}
                  />
                );
              })}
            </div>

            {/* Keypad layout */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/30 active:scale-90 active:bg-indigo-600 border border-slate-855 text-lg font-bold transition-all flex items-center justify-center cursor-pointer text-white"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={onCancel}
                className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-90 border border-slate-900 text-xs font-semibold text-rose-400 transition-all flex items-center justify-center cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress("0")}
                className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/30 active:scale-90 active:bg-indigo-600 border border-slate-855 text-lg font-bold transition-all flex items-center justify-center cursor-pointer text-white"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-850 hover:border-indigo-500/30 active:scale-90 active:bg-slate-800 border border-slate-855 text-slate-400 transition-all flex items-center justify-center cursor-pointer"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          /* ACTION SELECT (PIN IS CORRECT / UNREQUIRED) */
          <div className="w-full flex flex-col items-center">
            <p className="text-xs text-emerald-400 font-semibold mb-6 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" /> Identidad Confirmada
            </p>

            <div className="flex flex-col gap-4 w-full mb-2">
              <button
                type="button"
                onClick={() => handleFichar("entrada")}
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-extrabold transition-all text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <ShieldCheck className="h-5 w-5" />
                MARCAR ENTRADA
              </button>

              <button
                type="button"
                onClick={() => handleFichar("salida")}
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-sm font-extrabold transition-all text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <ArrowRight className="h-5 w-5" />
                MARCAR SALIDA
              </button>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-6 text-xs text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
            >
              Cambiar de empleado / Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
