import React from 'react';
import type { VentasResumen, Gasto } from '../types';
import { CalendarDays, CalendarRange, TrendingUp, Receipt, CreditCard, Banknote, ArrowUpRight, Percent } from 'lucide-react';

interface PeriodSummariesSectionProps {
  resumenData: VentasResumen[];
  dailyWorkedHours: Record<string, number>;
  dailyCost: Record<string, number>;
  foodCostPct: number;
  gastosList: Gasto[];
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const PeriodSummariesSection: React.FC<PeriodSummariesSectionProps> = ({
  resumenData,
  dailyWorkedHours,
  dailyCost,
  foodCostPct,
  gastosList
}) => {
  // Parsing helpers to avoid timezone offsets
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getWeekMondayStr = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  const getMonthStr = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${year}-${month}`;
  };

  const getYearStr = (dateStr: string) => {
    return dateStr.split('-')[0];
  };

  // Determine reference date (most recent date with sales data, or today)
  const refDate = resumenData.length > 0 ? resumenData[0].fecha : new Date().toISOString().split('T')[0];

  const refWeekMonday = getWeekMondayStr(refDate);
  const refMonth = getMonthStr(refDate);
  const refYear = getYearStr(refDate);

  const getWeekRangeLabel = (mondayStr: string) => {
    const monday = parseLocalDate(mondayStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const format = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${format(monday)} al ${format(sunday)}`;
  };

  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const name = NOMBRES_MESES[Number(month) - 1] || month;
    return `${name} ${year}`;
  };

  // Stats calculation engine
  const calculateStats = (filterFn: (dateStr: string) => boolean) => {
    let sales = 0;
    let tickets = 0;
    let cash = 0;
    let card = 0;
    let hours = 0;
    let laborCost = 0;

    const salesDates = resumenData.map(r => r.fecha);
    const laborDates = Object.keys(dailyWorkedHours);
    const allPeriodDates = Array.from(new Set([...salesDates, ...laborDates])).filter(filterFn);

    resumenData.forEach((row) => {
      if (filterFn(row.fecha)) {
        sales += Number(row.total_facturado) || 0;
        tickets += Number(row.num_tickets) || 0;
        cash += Number(row.total_efectivo) || 0;
        card += Number(row.total_tarjeta) || 0;
      }
    });

    allPeriodDates.forEach((dateStr) => {
      hours += dailyWorkedHours[dateStr] || 0;
      laborCost += dailyCost[dateStr] || 0;
    });

    let realGastos = 0;
    gastosList.forEach((g) => {
      if (filterFn(g.fecha)) {
        realGastos += Number(g.importe) || 0;
      }
    });

    const avgTicket = tickets > 0 ? sales / tickets : 0;
    const foodCost = realGastos > 0 ? realGastos : sales * (foodCostPct / 100);
    const totalCost = foodCost + laborCost;
    const profit = sales - totalCost;
    const laborCostPct = sales > 0 ? (laborCost / sales) * 100 : 0;
    const productivity = hours > 0 ? sales / hours : 0;

    const payTotal = cash + card;
    const pctCard = payTotal > 0 ? (card / payTotal) * 100 : 0;
    const pctCash = payTotal > 0 ? (cash / payTotal) * 100 : 0;

    return {
      sales,
      tickets,
      avgTicket,
      cash,
      card,
      pctCard,
      pctCash,
      hours,
      laborCost,
      laborCostPct,
      productivity,
      profit,
      foodCost,
      hasRealGastos: realGastos > 0
    };
  };

  const weekStats = calculateStats((d) => getWeekMondayStr(d) === refWeekMonday);
  const monthStats = calculateStats((d) => getMonthStr(d) === refMonth);
  const yearStats = calculateStats((d) => getYearStr(d) === refYear);

  const periods = [
    {
      title: 'Semana Actual',
      sub: getWeekRangeLabel(refWeekMonday),
      stats: weekStats,
      icon: CalendarDays,
      color: 'from-indigo-600 to-violet-600',
      textColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/20'
    },
    {
      title: 'Mes Actual',
      sub: getMonthLabel(refMonth),
      stats: monthStats,
      icon: CalendarRange,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Año en Curso',
      sub: `Período ${refYear}`,
      stats: yearStats,
      icon: TrendingUp,
      color: 'from-cyan-600 to-blue-600',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-indigo-400" />
        <h3 className="text-base font-bold text-white font-heading">
          Resúmenes de Rendimiento Acumulado
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {periods.map((p) => {
          const Icon = p.icon;
          const s = p.stats;

          return (
            <div
              key={p.title}
              className={`glass-card rounded-2xl border ${p.borderColor} p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 relative overflow-hidden group`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white font-heading tracking-tight">
                      {p.title}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                      {p.sub}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-4.5 w-4.5 ${p.textColor}`} />
                  </div>
                </div>

                {/* Sales Section */}
                <div className="space-y-1 mb-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Facturación Total</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-heading font-mono">
                      {s.sales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    <ArrowUpRight className="h-4.5 w-4.5 text-emerald-400 inline" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-350">
                    <span className="flex items-center gap-1 font-medium">
                      <Receipt className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      {s.tickets.toLocaleString('es-ES')} tickets
                    </span>
                    <span className="font-semibold text-slate-300 font-mono">
                      Medio: {s.avgTicket.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 my-3.5" />

                {/* Payments breakdown */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Métodos de Pago</span>
                    <span>% Tarjeta / Efec.</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/50 flex">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-l-full transition-all duration-500"
                      style={{ width: `${s.pctCard}%` }}
                      title={`Tarjeta: ${s.pctCard.toFixed(1)}%`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-r-full transition-all duration-500"
                      style={{ width: `${s.pctCash}%` }}
                      title={`Efectivo: ${s.pctCash.toFixed(1)}%`}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-semibold font-mono">
                    <span className="text-violet-400 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> {s.card.toLocaleString('es-ES', { maximumFractionDigits: 0 })} € ({s.pctCard.toFixed(0)}%)
                    </span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Banknote className="h-3 w-3" /> {s.cash.toLocaleString('es-ES', { maximumFractionDigits: 0 })} € ({s.pctCash.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 my-3.5" />

                {/* Personal & Productivity Section */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Coste Personal Est.</span>
                    <span className="font-bold text-rose-400 font-mono text-sm block">
                      {s.laborCost.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono flex items-center gap-0.5">
                      <Percent className="h-3 w-3 text-rose-500/80 shrink-0" />
                      {s.laborCostPct.toFixed(1)}% ventas
                    </span>
                  </div>

                  <div className="space-y-1 border-l border-slate-800/60 pl-3">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Productividad</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm block">
                      {s.productivity.toFixed(2)} €/h
                    </span>
                    <span className="text-[10px] text-slate-450 block font-mono font-medium">
                      {s.hours.toFixed(1)}h fichadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Estimated Profit */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {s.hasRealGastos ? 'Beneficio Neto (Real)' : 'Beneficio Neto Est.'}
                </span>
                <span className={`font-bold font-mono text-sm ${s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {s.profit >= 0 ? '+' : ''}{s.profit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
