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
import { Clock, CreditCard, Banknote, Coffee, Utensils, Sunset, Moon } from 'lucide-react';

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
  // Sort chronologically starting at 2:00 AM (business day start)
  const sortedVentasHora = [...ventasHora].sort((a, b) => {
    const valA = (a.hora - 2 + 24) % 24;
    const valB = (b.hora - 2 + 24) % 24;
    return valA - valB;
  });

  const chartData = sortedVentasHora.map((v) => ({
    hora: `${v.hora}:00`,
    total: v.total_facturado,
    tickets: v.num_tickets
  }));

  const totalCobros = totalEfectivo + totalTarjeta;
  const pctEfectivo = totalCobros > 0 ? ((totalEfectivo / totalCobros) * 100).toFixed(1) : '0';
  const pctTarjeta = totalCobros > 0 ? ((totalTarjeta / totalCobros) * 100).toFixed(1) : '0';

  // Calculate Turn Sales
  const turnTotals = {
    desayuno: 0,
    comida: 0,
    tarde: 0,
    cena: 0
  };

  ventasHora.forEach((v) => {
    const h = v.hora;
    const total = v.total_facturado;
    if (h >= 6 && h < 12) {
      turnTotals.desayuno += total;
    } else if (h >= 12 && h < 17) {
      turnTotals.comida += total;
    } else if (h >= 17 && h < 20) {
      turnTotals.tarde += total;
    } else {
      turnTotals.cena += total;
    }
  });

  const totalTurnos = turnTotals.desayuno + turnTotals.comida + turnTotals.tarde + turnTotals.cena;

  const getPct = (val: number) => {
    return totalTurnos > 0 ? ((val / totalTurnos) * 100).toFixed(0) : '0';
  };

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

        <div className="h-52 sm:h-[320px] w-full">
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
                  labelFormatter={(label) => `Hora: ${typeof label === 'string' || typeof label === 'number' ? label : ''}`}
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

      {/* Desglose por Medio de Pago y Turnos (1 col en Desktop) */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          {/* Formas de Pago */}
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4.5 w-4.5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-heading">
              Formas de Pago
            </h3>
          </div>

          {/* Tarjeta Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-violet-400 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Tarjeta ({pctTarjeta}%)
              </span>
              <span className="text-white font-mono">{totalTarjeta.toFixed(2)} €</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${pctTarjeta}%` }}
              />
            </div>
          </div>

          {/* Efectivo Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] font-semibold mb-1">
              <span className="text-amber-400 flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Efectivo ({pctEfectivo}%)
              </span>
              <span className="text-white font-mono">{totalEfectivo.toFixed(2)} €</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${pctEfectivo}%` }}
              />
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-4" />

          {/* Ventas por Turnos */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4.5 w-4.5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white font-heading">
              Ventas por Turno
            </h3>
          </div>

          {/* Desayuno */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] font-semibold mb-1">
              <span className="text-amber-300 flex items-center gap-1">
                <Coffee className="h-3 w-3" /> Desayuno ({getPct(turnTotals.desayuno)}%)
              </span>
              <span className="text-white font-mono">{turnTotals.desayuno.toFixed(1)} €</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${getPct(turnTotals.desayuno)}%` }}
              />
            </div>
          </div>

          {/* Almuerzo */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] font-semibold mb-1">
              <span className="text-emerald-400 flex items-center gap-1">
                <Utensils className="h-3 w-3" /> Almuerzo ({getPct(turnTotals.comida)}%)
              </span>
              <span className="text-white font-mono">{turnTotals.comida.toFixed(1)} €</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${getPct(turnTotals.comida)}%` }}
              />
            </div>
          </div>

          {/* Tarde */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] font-semibold mb-1">
              <span className="text-orange-400 flex items-center gap-1">
                <Sunset className="h-3 w-3" /> Tarde ({getPct(turnTotals.tarde)}%)
              </span>
              <span className="text-white font-mono">{turnTotals.tarde.toFixed(1)} €</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${getPct(turnTotals.tarde)}%` }}
              />
            </div>
          </div>

          {/* Cena */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] font-semibold mb-1">
              <span className="text-violet-400 flex items-center gap-1">
                <Moon className="h-3 w-3" /> Cena ({getPct(turnTotals.cena)}%)
              </span>
              <span className="text-white font-mono">{turnTotals.cena.toFixed(1)} €</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${getPct(turnTotals.cena)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-2">
          <span>Total Recaudado</span>
          <span className="font-bold text-emerald-400 text-sm font-mono">
            {totalCobros.toFixed(2)} €
          </span>
        </div>
      </div>
    </div>
  );
};
