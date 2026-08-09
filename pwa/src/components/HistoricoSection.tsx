import React, { useState } from 'react';
import type { HistoricoItem } from '../types';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface HistoricoSectionProps {
  semanal: HistoricoItem[];
  mensual: HistoricoItem[];
  anual: HistoricoItem[];
}

export const HistoricoSection: React.FC<HistoricoSectionProps> = ({
  semanal,
  mensual,
  anual
}) => {
  const [periodoTab, setPeriodoTab] = useState<'semanal' | 'mensual' | 'anual'>('mensual');

  const dataMap = {
    semanal,
    mensual,
    anual
  };

  const currentData = dataMap[periodoTab];

  const totalVentas = currentData.reduce((acc, i) => acc + i.ventas, 0);
  const totalGastos = currentData.reduce((acc, i) => acc + i.gastos, 0);
  const totalBeneficio = currentData.reduce((acc, i) => acc + i.beneficio, 0);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-5">
      {/* Header and Period Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Análisis Histórico: Ventas vs Gastos y Beneficios
            </h3>
            <p className="text-xs text-slate-400">
              Evolución acumulada de facturación e inventario/costes
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPeriodoTab('semanal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodoTab === 'semanal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semanales
          </button>
          <button
            type="button"
            onClick={() => setPeriodoTab('mensual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodoTab === 'mensual'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mensuales
          </button>
          <button
            type="button"
            onClick={() => setPeriodoTab('anual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodoTab === 'anual'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anuales
          </button>
        </div>
      </div>

      {/* KPI Mini Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Facturación Total</span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
            {totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Gastos / Costes Est.</span>
          <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
            {totalGastos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Beneficio Neto Est.</span>
          <div className="text-xl font-bold text-indigo-400 font-mono mt-0.5">
            {totalBeneficio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-52 sm:h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="periodo" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => val.replace('Semana ', '')} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc'
              }}
              formatter={(val: any, name: any) => [`${Number(val).toLocaleString('es-ES')} €`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="ventas" name="Ventas Total (€)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" name="Gastos / Proveedores (€)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="beneficio" name="Beneficio Neto (€)" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table (Desktop only) */}
      <div className="hidden md:block overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <th className="py-2.5 px-3">Periodo</th>
              <th className="py-2.5 px-3 text-center">Tickets</th>
              <th className="py-2.5 px-3 text-right">Ventas (€)</th>
              <th className="py-2.5 px-3 text-right">Gastos / Proveedores (€)</th>
              <th className="py-2.5 px-3 text-right font-bold text-slate-200">Beneficio Neto (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-medium">
            {currentData.map((row) => (
              <tr key={row.periodo} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-white">{row.periodo}</td>
                <td className="py-2.5 px-3 text-center font-mono">{row.tickets.toLocaleString('es-ES')}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-bold">
                  {row.ventas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </td>
                <td className="py-2.5 px-3 text-right text-rose-400 font-mono">
                  {row.gastos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-indigo-400 font-mono">
                  {row.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail List (Mobile only) */}
      <div className="block md:hidden space-y-3 pt-2">
        {currentData.map((row) => (
          <div key={row.periodo} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{row.periodo}</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-850 font-mono text-[10px] text-slate-350 font-bold">
                Tickets: {row.tickets.toLocaleString('es-ES')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px] font-semibold uppercase">Ventas</span>
                <span className="font-mono text-emerald-400 font-bold">{row.ventas.toLocaleString('es-ES', { minimumFractionDigits: 1 })} €</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] font-semibold uppercase">Gastos</span>
                <span className="font-mono text-rose-400 font-bold">{row.gastos.toLocaleString('es-ES', { minimumFractionDigits: 1 })} €</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[9px] font-semibold uppercase">Beneficio</span>
                <span className="font-mono text-indigo-400 font-extrabold text-xs">{row.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 1 })} €</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
