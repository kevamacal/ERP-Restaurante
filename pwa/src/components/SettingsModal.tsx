import React, { useState } from 'react';
import { X, Check, AlertCircle, Save, Percent, Coins } from 'lucide-react';
import { getSupabase } from '../supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [foodCostPct, setFoodCostPct] = useState(localStorage.getItem('app_food_cost_pct') || '30');
  const [hourlyWage, setHourlyWage] = useState(localStorage.getItem('app_hourly_wage') || '10');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

  if (!isOpen) return null;

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    try {
      // Save operational cost values in localStorage
      localStorage.setItem('app_food_cost_pct', foodCostPct);
      localStorage.setItem('app_hourly_wage', hourlyWage);

      // Verify connection to Supabase (using variables defined in the environment)
      const client = getSupabase();
      if (!client) {
        throw new Error('Faltan configurar las variables de entorno de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      }

      const { error } = await client.from('locales').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') {
        setStatus({ type: 'error', msg: `Conexión a Supabase con aviso: ${error.message}` });
      } else {
        setStatus({ type: 'success', msg: '¡Parámetros de costes guardados correctamente!' });
      }

      onSaved();
      setTimeout(() => {
        onClose();
        setStatus({ type: null, msg: '' });
      }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', msg: `Error al verificar: ${err.message || err}` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700/60 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-white font-heading mb-1">
          Configuración de Costes
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Ajusta los porcentajes de coste de materia prima y coste de personal para el cálculo de tus métricas financieras.
        </p>

        {status.msg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {status.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="border-b border-slate-800 pb-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Parámetros de Costes y Métricas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-indigo-400" /> Coste Materia Prima
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="30"
                  value={foodCostPct}
                  onChange={(e) => setFoodCostPct(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-indigo-400" /> Coste Personal / Hora
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="10"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">€</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
