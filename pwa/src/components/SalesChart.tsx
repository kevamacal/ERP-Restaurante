import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { VentaHora } from '../types';
import { Clock, CreditCard, Banknote } from 'lucide-react';

interface SalesChartProps {
  ventasHora: VentaHora[];
  totalEfectivo: number;
  totalTarjeta: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  ventasHora,
  totalEfectivo,
  totalTarjeta
}) => {
  const chartData = ventasHora.map((v) => ({
    hora: `${v.hora}:00`,
    total: v.total_facturado,
    tickets: v.num_tickets
  }));

  const totalCobros = totalEfectivo + totalTarjeta;
  const pctEfectivo = totalCobros > 0 ? ((totalEfectivo / totalCobros) * 100).toFixed(1) : '0';
  const pctTarjeta = totalCobros > 0 ? ((totalTarjeta / totalCobros) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gráfica de Ventas por Hora (2 cols en Desktop) */}
      <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white font-heading">
              Distribución de Ventas por Hora
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            Intradía
          </span>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hora" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  formatter={(value: any) => [`${value} €`, 'Total Facturado']}
                  labelFormatter={(label) => `Hora: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Sin datos de ventas por hora para este periodo.
            </div>
          )}
        </div>
      </div>

      {/* Desglose por Medio de Pago (1 col en Desktop) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-heading">
              Formas de Pago
            </h3>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Proporción de ingresos recibidos en tarjeta bancaria vs dinero en efectivo.
          </p>

          {/* Tarjeta Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-violet-400 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Tarjeta ({pctTarjeta}%)
              </span>
              <span className="text-white font-mono">{totalTarjeta.toFixed(2)} €</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${pctTarjeta}%` }}
              />
            </div>
          </div>

          {/* Efectivo Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-amber-400 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5" /> Efectivo ({pctEfectivo}%)
              </span>
              <span className="text-white font-mono">{totalEfectivo.toFixed(2)} €</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${pctEfectivo}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Total Recaudado</span>
          <span className="font-bold text-emerald-400 text-sm font-mono">
            {totalCobros.toFixed(2)} €
          </span>
        </div>
      </div>
    </div>
  );
};
