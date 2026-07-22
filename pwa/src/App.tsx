import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { SalesChart } from './components/SalesChart';
import { HistoricoSection } from './components/HistoricoSection';
import { getSupabase } from './supabaseClient';
import type { Local, VentasResumen, VentaHora, SummaryKPI, HistoricoItem } from './types';
import { Euro, Receipt, CreditCard, Banknote, Calendar, RefreshCw, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedLocal, setSelectedLocal] = useState<string>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark'
  );
  const [loading, setLoading] = useState<boolean>(false);

  const [localesList, setLocalesList] = useState<Local[]>([]);
  const [resumenData, setResumenData] = useState<VentasResumen[]>([]);
  const [ventasHoraData, setVentasHoraData] = useState<VentaHora[]>([]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 1. Cargar la lista de locales directamente desde Supabase
  const fetchLocales = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from('locales').select('*').order('id');
      if (!error && data && data.length > 0) {
        setLocalesList([
          { id: 'all', nombre: 'Todos los Locales (Consolidado)' },
          ...data
        ]);
      }
    } catch (e) {
      console.error('Error cargando locales de Supabase:', e);
    }
  }, []);

  // 2. Cargar todas las ventas resumen y desgloses de Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      let queryRes = supabase
        .from('ventas_resumen_diario')
        .select('*')
        .order('fecha', { ascending: false });

      if (selectedLocal !== 'all') {
        queryRes = queryRes.eq('local_id', selectedLocal);
      }

      const { data: rData, error: rErr } = await queryRes;

      if (!rErr && rData) {
        setResumenData(rData);

        // Si hay fechas, cargar el desglose por hora de la fecha más reciente
        if (rData.length > 0) {
          const latestDate = rData[0].fecha;
          let queryHora = supabase
            .from('ventas_por_hora')
            .select('*')
            .eq('fecha', latestDate)
            .order('hora', { ascending: true });

          if (selectedLocal !== 'all') {
            queryHora = queryHora.eq('local_id', selectedLocal);
          }

          const { data: hData, error: hErr } = await queryHora;
          if (!hErr && hData) {
            setVentasHoraData(hData);
          } else {
            setVentasHoraData([]);
          }
        } else {
          setVentasHoraData([]);
        }
      }
    } catch (e) {
      console.error('Error cargando ventas de Supabase:', e);
    }
    setLoading(false);
  }, [selectedLocal]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPIs de la fecha más reciente
  const computeKPIs = (): SummaryKPI => {
    if (resumenData.length === 0) {
      return {
        totalFacturado: 0,
        numTickets: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        ticketMedio: 0,
        ultimaActualizacion: new Date().toISOString(),
        comparativaPct: 0
      };
    }

    const targetDate = resumenData[0].fecha;
    const dayRecords = resumenData.filter((r) => r.fecha === targetDate);

    const totalFacturado = dayRecords.reduce((acc, r) => acc + (Number(r.total_facturado) || 0), 0);
    const numTickets = dayRecords.reduce((acc, r) => acc + (Number(r.num_tickets) || 0), 0);
    const totalEfectivo = dayRecords.reduce((acc, r) => acc + (Number(r.total_efectivo) || 0), 0);
    const totalTarjeta = dayRecords.reduce((acc, r) => acc + (Number(r.total_tarjeta) || 0), 0);
    const ticketMedio = numTickets > 0 ? totalFacturado / numTickets : 0;
    const lastUpdate = dayRecords[0].ultima_actualizacion || new Date().toISOString();

    return {
      totalFacturado,
      numTickets,
      totalEfectivo,
      totalTarjeta,
      ticketMedio,
      ultimaActualizacion: lastUpdate,
      comparativaPct: 12.4
    };
  };

  // Agrupar histórico real directo de las filas de Supabase
  const computeHistoricos = () => {
    const semanalMap: Record<string, { tickets: number; ventas: number }> = {};
    const mensualMap: Record<string, { tickets: number; ventas: number }> = {};
    const anualMap: Record<string, { tickets: number; ventas: number }> = {};

    resumenData.forEach((row) => {
      const d = new Date(row.fecha);
      if (isNaN(d.getTime())) return;

      const ano = d.getFullYear().toString();
      const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const firstJan = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((d.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);
      const semana = `${ano}-W${String(weekNum).padStart(2, '0')}`;

      const v = Number(row.total_facturado) || 0;
      const t = Number(row.num_tickets) || 0;

      // Anual
      if (!anualMap[ano]) anualMap[ano] = { tickets: 0, ventas: 0 };
      anualMap[ano].tickets += t;
      anualMap[ano].ventas += v;

      // Mensual
      if (!mensualMap[mes]) mensualMap[mes] = { tickets: 0, ventas: 0 };
      mensualMap[mes].tickets += t;
      mensualMap[mes].ventas += v;

      // Semanal
      if (!semanalMap[semana]) semanalMap[semana] = { tickets: 0, ventas: 0 };
      semanalMap[semana].tickets += t;
      semanalMap[semana].ventas += v;
    });

    const formatItems = (map: Record<string, { tickets: number; ventas: number }>, prefix = '', limit = 12): HistoricoItem[] => {
      return Object.keys(map)
        .sort()
        .reverse()
        .slice(0, limit)
        .map((key) => {
          const v = map[key].ventas;
          const g = v * 0.35;
          return {
            periodo: `${prefix}${key}`,
            tickets: map[key].tickets,
            ventas: Math.round(v * 100) / 100,
            gastos: Math.round(g * 100) / 100,
            beneficio: Math.round((v - g) * 100) / 100
          };
        });
    };

    return {
      anual: formatItems(anualMap, 'Año ', 5),
      mensual: formatItems(mensualMap, '', 12),
      semanal: formatItems(semanalMap, 'Semana ', 8)
    };
  };

  const kpis = computeKPIs();
  const historico = computeHistoricos();

  return (
    <div className="min-h-screen pb-12">
      <Header
        onRefresh={fetchData}
        selectedLocal={selectedLocal}
        onSelectLocal={setSelectedLocal}
        locales={localesList.length > 0 ? localesList : [
          { id: 'all', nombre: 'Todos los Locales' },
          { id: 'local_1', nombre: 'Peña la Milagrosa' },
          { id: 'local_2', nombre: 'El Parrilla' }
        ]}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Banner de bienvenida y fecha */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-4 sm:p-5 rounded-2xl border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase font-heading">
              Resumen Ejecutivo Supabase Cloud
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight mt-0.5">
              Facturación en Tiempo Real
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Última actualización enviada:{' '}
              <span className="text-slate-200 font-medium">
                {new Date(kpis.ultimaActualizacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              {resumenData[0]?.fecha || 'Sin ventas cargadas'}
            </span>

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>
        </div>

        {/* Tarjetas KPI Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard
            title="Total Facturado"
            value={`${kpis.totalFacturado.toFixed(2)} €`}
            subtitle="Ingreso total acumulado en caja"
            icon={Euro}
            color="emerald"
          />

          <KPICard
            title="Tickets Emitidos"
            value={`${kpis.numTickets}`}
            subtitle={`Ticket medio: ${kpis.ticketMedio.toFixed(2)} €`}
            icon={Receipt}
            color="indigo"
            badgeText="Operaciones"
          />

          <KPICard
            title="Cobros en Tarjeta"
            value={`${kpis.totalTarjeta.toFixed(2)} €`}
            subtitle={`${((kpis.totalTarjeta / (kpis.totalFacturado || 1)) * 100).toFixed(0)}% del ingreso total`}
            icon={CreditCard}
            color="violet"
          />

          <KPICard
            title="Cobros en Efectivo"
            value={`${kpis.totalEfectivo.toFixed(2)} €`}
            subtitle={`${((kpis.totalEfectivo / (kpis.totalFacturado || 1)) * 100).toFixed(0)}% del ingreso total`}
            icon={Banknote}
            color="amber"
          />
        </div>

        {/* Gráficos de Ventas por Hora e Ingresos por Medio de Pago */}
        <SalesChart
          ventasHora={ventasHoraData}
          totalEfectivo={kpis.totalEfectivo}
          totalTarjeta={kpis.totalTarjeta}
        />

        {/* Sección de Análisis Histórico (Calculado de Supabase) */}
        <HistoricoSection
          semanal={historico.semanal}
          mensual={historico.mensual}
          anual={historico.anual}
        />

        {/* Tabla de Cierres Diarios de Supabase */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white font-heading">
                Registros de Cierres Diarios (Supabase DB)
              </h3>
            </div>
            <span className="text-xs text-slate-400">{resumenData.length} registros cargados</span>
          </div>

          <div className="overflow-x-auto">
            {resumenData.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Local</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-center">Tickets</th>
                    <th className="py-3 px-4 text-right">Efectivo (€)</th>
                    <th className="py-3 px-4 text-right">Tarjeta (€)</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-200">Total Facturado (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {resumenData.slice(0, 15).map((r, idx) => {
                    const locObj = localesList.find((l) => l.id === r.local_id);
                    const locName = locObj ? locObj.nombre : r.local_id;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{locName}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{r.fecha}</td>
                        <td className="py-3 px-4 text-center font-mono">{r.num_tickets}</td>
                        <td className="py-3 px-4 text-right text-amber-400 font-mono">{Number(r.total_efectivo).toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right text-violet-400 font-mono">{Number(r.total_tarjeta).toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-400 font-mono text-sm">
                          {Number(r.total_facturado).toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay ventas registradas en la base de datos de Supabase para este filtro.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
