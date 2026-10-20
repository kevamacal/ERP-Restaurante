import React, { useEffect, useRef, useState } from "react";
import { X, Check, AlertCircle, Save, Percent, Coins } from "lucide-react";
import {
  MAX_FOOD_COST_PCT,
  MAX_HOURLY_WAGE,
  saveCostSettings,
} from "../utils/costSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentFoodCostPct: number;
  currentHourlyWage: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentFoodCostPct,
  currentHourlyWage,
}) => {
  const [foodCostPct, setFoodCostPct] = useState(String(currentFoodCostPct));
  const [hourlyWage, setHourlyWage] = useState(String(currentHourlyWage));
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    msg: string;
  }>({ type: null, msg: "" });
  const wasOpen = useRef(false);

  // El modal se queda montado entre aperturas: refresca los valores y el
  // mensaje solo al abrir, no cuando `onSaved` cambia los valores actuales
  // (eso borraría el mensaje de éxito recién pintado).
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setFoodCostPct(String(currentFoodCostPct));
      setHourlyWage(String(currentHourlyWage));
      setStatus({ type: null, msg: "" });
    }

    wasOpen.current = isOpen;
  }, [isOpen, currentFoodCostPct, currentHourlyWage]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedFoodCost = Number(foodCostPct);
    if (
      foodCostPct.trim() === "" ||
      !Number.isFinite(parsedFoodCost) ||
      parsedFoodCost < 0 ||
      parsedFoodCost > MAX_FOOD_COST_PCT
    ) {
      setStatus({
        type: "error",
        msg: `El coste de materia prima debe estar entre 0 y ${MAX_FOOD_COST_PCT} %.`,
      });
      return;
    }

    const parsedWage = Number(hourlyWage);
    if (
      hourlyWage.trim() === "" ||
      !Number.isFinite(parsedWage) ||
      parsedWage < 0 ||
      parsedWage > MAX_HOURLY_WAGE
    ) {
      setStatus({
        type: "error",
        msg: `El coste por hora debe estar entre 0 y ${MAX_HOURLY_WAGE} €.`,
      });
      return;
    }

    try {
      saveCostSettings({
        foodCostPct: parsedFoodCost,
        hourlyWage: parsedWage,
      });
    } catch (error) {
      console.error("[ajustes] No se pudieron guardar los costes:", error);
      setStatus({
        type: "error",
        msg: "No se pudieron guardar los ajustes en este navegador.",
      });
      return;
    }

    setStatus({
      type: "success",
      msg: "¡Parámetros de costes guardados correctamente!",
    });
    onSaved();

    setTimeout(() => {
      onClose();
      setStatus({ type: null, msg: "" });
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-300 dark:border-slate-700/60 shadow-2xl relative animate-in fade-in zoom-in duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ajustes"
          className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h2
          id="settings-modal-title"
          className="text-xl font-bold text-slate-900 dark:text-white font-heading mb-1"
        >
          Configuración de Costes
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Ajusta los parámetros de coste operativo para tus métricas de
          rentabilidad.
        </p>

        {status.msg && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
              status.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {status.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Parámetros de Costes y Métricas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-food-cost"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Percent className="h-3.5 w-3.5 text-indigo-400" /> Coste Materia
                Prima
              </label>
              <div className="relative">
                <input
                  id="settings-food-cost"
                  type="number"
                  min="0"
                  max={MAX_FOOD_COST_PCT}
                  step="1"
                  placeholder="30"
                  value={foodCostPct}
                  onChange={(e) => setFoodCostPct(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  %
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-hourly-wage"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5"
              >
                <Coins className="h-3.5 w-3.5 text-indigo-400" /> Coste Personal
                / Hora
              </label>
              <div className="relative">
                <input
                  id="settings-hourly-wage"
                  type="number"
                  min="0"
                  max={MAX_HOURLY_WAGE}
                  step="0.5"
                  placeholder="10"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  €
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Se guardan en este dispositivo. El coste por hora de cada empleado,
            si está definido, tiene prioridad sobre este valor.
          </p>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
