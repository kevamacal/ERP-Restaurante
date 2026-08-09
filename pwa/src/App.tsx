import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { SalesChart } from './components/SalesChart';
import { HistoricoSection } from './components/HistoricoSection';
import { PeriodSummariesSection } from './components/PeriodSummariesSection';
import { getSupabase } from './supabaseClient';
import type { Local, VentasResumen, VentaHora, SummaryKPI, HistoricoItem, Empleado } from './types';
import { Euro, Receipt, CreditCard, Calendar, RefreshCw, Layers, Clock, UserPlus, Users, ToggleLeft, ToggleRight, Zap, Coins } from 'lucide-react';
import { ClockInView } from './components/ClockInView';
import { AdminPinLock } from './components/AdminPinLock';
import { SettingsModal } from './components/SettingsModal';

const getWeekRange = (offset: number) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

const getWeekDatesList = (monday: Date) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return dates;
};

export const App: React.FC = () => {
  const [selectedLocal, setSelectedLocal] = useState<string>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark'
  );
  const [loading, setLoading] = useState<boolean>(false);

  const [localesList, setLocalesList] = useState<Local[]>([]);
  const [resumenData, setResumenData] = useState<VentasResumen[]>([]);
  const [ventasHoraData, setVentasHoraData] = useState<VentaHora[]>([]);

  // Navigation & Security
  const [view, setView] = useState<'fichar' | 'dashboard'>('fichar');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    sessionStorage.getItem('admin_authenticated') === 'true'
  );

  // Admin Horario States
  const [activeTab, setActiveTab] = useState<'sales' | 'horario'>('sales');
  const [fichajesList, setFichajesList] = useState<any[]>([]);
  const [adminEmployees, setAdminEmployees] = useState<Empleado[]>([]);
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpPin, setNewEmpPin] = useState<string>('0000');
  const [mobileTab, setMobileTab] = useState<'summary' | 'charts' | 'admin'>('summary');

  // Parameters and Metrics
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [foodCostPct, setFoodCostPct] = useState<number>(() => {
    const val = localStorage.getItem('app_food_cost_pct');
    return val ? Number(val) : 30;
  });
  const [hourlyWage, setHourlyWage] = useState<number>(() => {
    const val = localStorage.getItem('app_hourly_wage');
    return val ? Number(val) : 10;
  });
  const [fichajesAll, setFichajesAll] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Worked hours and labor cost calculations
  const shiftMetrics = React.useMemo(() => {
    const dailyHours: Record<string, number> = {};
    const dailyCost: Record<string, number> = {};
    const employeeDailyHours: Record<string, Record<string, number>> = {}; // date -> empId -> hours

    const employeeLastEntrada: Record<string, number> = {}; // empId -> timestamp

    // Sort chronologically ascending
    const sorted = [...fichajesAll].sort(
      (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    sorted.forEach((fic) => {
      const empId = fic.empleado_id;
      const time = new Date(fic.fecha_hora);
      
      if (fic.tipo === 'entrada') {
        employeeLastEntrada[empId] = time.getTime();
      } else if (fic.tipo === 'salida') {
        const entradaTime = employeeLastEntrada[empId];
        if (entradaTime) {
          const diffHours = (time.getTime() - entradaTime) / (1000 * 60 * 60);
          // Capping shift at 16 hours to handle missing check-outs
          const validHours = diffHours > 16 ? 8 : Math.max(0, diffHours);
          
          // Cost rate: specific employee's rate, fallback to global settings
          const rate = fic.empleados?.coste_hora !== undefined && fic.empleados?.coste_hora !== null
            ? Number(fic.empleados.coste_hora)
            : hourlyWage;
          const shiftCost = validHours * rate;

          // Use entry date in local timezone to match business date (shifts start at 2 AM)
          const d = new Date(entradaTime);
          if (d.getHours() < 2) {
            d.setDate(d.getDate() - 1);
          }
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          dailyHours[dateStr] = (dailyHours[dateStr] || 0) + validHours;
          dailyCost[dateStr] = (dailyCost[dateStr] || 0) + shiftCost;

          if (!employeeDailyHours[dateStr]) {
            employeeDailyHours[dateStr] = {};
          }
          employeeDailyHours[dateStr][empId] = (employeeDailyHours[dateStr][empId] || 0) + validHours;

          delete employeeLastEntrada[empId];
        }
      }
    });

    return {
      dailyHours,
      dailyCost,
      employeeDailyHours
    };
  }, [fichajesAll, hourlyWage]);

  const dailyWorkedHours = React.useMemo(() => shiftMetrics.dailyHours, [shiftMetrics]);

  // Weekly payments calculation
  const weeklyPaymentsData = React.useMemo(() => {
    const { monday, sunday } = getWeekRange(weekOffset);
    const datesInWeek = getWeekDatesList(monday);
    
    // Group by employee
    const employeePayments: Record<string, { id: string; name: string; hours: number; rate: number; total: number }> = {};

    // First initialize with all employees from adminEmployees so they appear even with 0 hours
    adminEmployees.forEach((emp) => {
      const rate = emp.coste_hora !== undefined && emp.coste_hora !== null
        ? Number(emp.coste_hora)
        : hourlyWage;
      employeePayments[emp.id] = {
        id: emp.id,
        name: emp.nombre,
        hours: 0,
        rate: rate,
        total: 0
      };
    });

    // Sum hours from shiftMetrics.employeeDailyHours for the dates in this week
    datesInWeek.forEach((dateStr) => {
      const dayHours = shiftMetrics.employeeDailyHours[dateStr];
      if (dayHours) {
        Object.entries(dayHours).forEach(([empId, hours]) => {
          if (employeePayments[empId]) {
            employeePayments[empId].hours += hours;
            employeePayments[empId].total = employeePayments[empId].hours * employeePayments[empId].rate;
          } else {
            // Fallback for deactivated or deleted employee
            const relatedFic = fichajesAll.find((f) => f.empleado_id === empId);
            const name = relatedFic?.empleados?.nombre || 'Desconocido';
            const rate = relatedFic?.empleados?.coste_hora !== undefined && relatedFic?.empleados?.coste_hora !== null
              ? Number(relatedFic.empleados.coste_hora)
              : hourlyWage;
            employeePayments[empId] = {
              id: empId,
              name,
              hours: hours,
              rate,
              total: hours * rate
            };
          }
        });
      }
    });

    return {
      mondayDate: monday,
      sundayDate: sunday,
      list: Object.values(employeePayments).sort((a, b) => b.total - a.total),
      grandTotal: Object.values(employeePayments).reduce((acc, emp) => acc + emp.total, 0)
    };
  }, [weekOffset, adminEmployees, shiftMetrics, hourlyWage, fichajesAll]);

  const dailyResumenData = React.useMemo(() => {
    const grouped = new Map<string, VentasResumen>();

    resumenData.forEach((row) => {
      const dateKey = row.fecha;
      const existing = grouped.get(dateKey);
      const totalFacturado = Number(row.total_facturado) || 0;
      const numTickets = Number(row.num_tickets) || 0;
      const totalEfectivo = Number(row.total_efectivo) || 0;
      const totalTarjeta = Number(row.total_tarjeta) || 0;
      const ultimaActualizacion = row.ultima_actualizacion || new Date().toISOString();

      if (!existing) {
        grouped.set(dateKey, {
          local_id: selectedLocal === 'all' ? 'all' : row.local_id,
          fecha: dateKey,
          total_facturado: totalFacturado,
          num_tickets: numTickets,
          total_efectivo: totalEfectivo,
          total_tarjeta: totalTarjeta,
          ultima_actualizacion: ultimaActualizacion
        });
      } else {
        grouped.set(dateKey, {
          ...existing,
          total_facturado: existing.total_facturado + totalFacturado,
          num_tickets: existing.num_tickets + numTickets,
          total_efectivo: existing.total_efectivo + totalEfectivo,
          total_tarjeta: existing.total_tarjeta + totalTarjeta,
          ultima_actualizacion: existing.ultima_actualizacion || ultimaActualizacion
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [resumenData, selectedLocal]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchLocales = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from('locales').select('id, nombre, ip_publica').order('id');
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

        // Fetch all clock-ins to compute worked hours
        let queryFic = supabase
          .from('fichajes')
          .select('*, empleados!inner(nombre, local_id, coste_hora)');
        if (selectedLocal !== 'all') {
          queryFic = queryFic.eq('empleados.local_id', selectedLocal);
        }
        let { data: ficsData, error: ficsErr } = await queryFic.order('fecha_hora', { ascending: true });
        
        if (ficsErr) {
          // Fallback if coste_hora column does not exist
          let queryFallback = supabase
            .from('fichajes')
            .select('*, empleados!inner(nombre, local_id)');
          if (selectedLocal !== 'all') {
            queryFallback = queryFallback.eq('empleados.local_id', selectedLocal);
          }
          const { data, error } = await queryFallback.order('fecha_hora', { ascending: true });
          ficsData = data;
          ficsErr = error;
        }

        if (!ficsErr && ficsData) {
          setFichajesAll(ficsData);
          setFichajesList([...ficsData].reverse().slice(0, 50));
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
    if (isAdminAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAdminAuthenticated]);

  // Handle routing / hash changes (Defaults to 'fichar' view, requires 'admin' in path/hash for dashboard)
  useEffect(() => {
    const handleHashChange = () => {
      const isAdmin = window.location.pathname === '/admin' || 
                      window.location.hash === '#/admin' || 
                      window.location.search.includes('admin');
      setView(isAdmin ? 'dashboard' : 'fichar');
      if (!isAdmin) {
        // Clear admin authentication when leaving dashboard to worker clock-in view
        setIsAdminAuthenticated(false);
        sessionStorage.removeItem('admin_authenticated');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchAdminHorarioData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. Fetch employees
      let queryEmp = supabase.from('empleados').select('*').order('nombre');
      if (selectedLocal !== 'all') {
        queryEmp = queryEmp.eq('local_id', selectedLocal);
      }
      const { data: emps } = await queryEmp;
      if (emps) setAdminEmployees(emps);

      // 2. Fetch all clock-ins
      let queryFic = supabase
        .from('fichajes')
        .select('*, empleados!inner(nombre, local_id, coste_hora)');
      if (selectedLocal !== 'all') {
        queryFic = queryFic.eq('empleados.local_id', selectedLocal);
      }
      let { data: ficsData, error: ficsErr } = await queryFic.order('fecha_hora', { ascending: true });
      
      if (ficsErr) {
        // Fallback in case coste_hora column does not exist yet
        let queryFallback = supabase
          .from('fichajes')
          .select('*, empleados!inner(nombre, local_id)');
        if (selectedLocal !== 'all') {
          queryFallback = queryFallback.eq('empleados.local_id', selectedLocal);
        }
        const { data, error } = await queryFallback.order('fecha_hora', { ascending: true });
        ficsData = data;
        ficsErr = error;
      }

      if (ficsData) {
        setFichajesAll(ficsData);
        setFichajesList([...ficsData].reverse().slice(0, 50));
      }
    } catch (e) {
      console.error('Error fetching admin horario data:', e);
    }
  }, [selectedLocal]);

  useEffect(() => {
    if (activeTab === 'horario' && isAdminAuthenticated) {
      fetchAdminHorarioData();
    }
  }, [activeTab, selectedLocal, isAdminAuthenticated, fetchAdminHorarioData]);

  const handleAddEmployee = async () => {
    if (!newEmpName.trim()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const targetLocal = selectedLocal === 'all' ? 'local_1' : selectedLocal;
    try {
      const { error } = await supabase.from('empleados').insert([
        {
          local_id: targetLocal,
          nombre: newEmpName.trim(),
          pin_empleado: newEmpPin || '0000',
          activo: true
        }
      ]);
      if (!error) {
        setNewEmpName('');
        setNewEmpPin('0000');
        fetchAdminHorarioData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEmployeeActive = async (id: string, currentActive: boolean) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('empleados')
        .update({ activo: !currentActive })
        .eq('id', id);
      if (!error) {
        fetchAdminHorarioData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLocalRateChange = (id: string, valStr: string) => {
    const parsed = valStr === '' ? undefined : Number(valStr);
    setAdminEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, coste_hora: parsed } : emp))
    );
  };

  const handleSaveEmployeeRate = async (id: string, rate: number | undefined | null) => {
    const finalRate = rate === undefined || rate === null || Number.isNaN(rate) ? hourlyWage : rate;
    
    // Normalize state to final saved rate
    setAdminEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, coste_hora: finalRate } : emp))
    );

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('empleados')
        .update({ coste_hora: finalRate })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating hourly rate:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const computeKPIs = (): SummaryKPI => {
    if (dailyResumenData.length === 0) {
      return {
        totalFacturado: 0,
        numTickets: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        ticketMedio: 0,
        ultimaActualizacion: new Date().toISOString(),
        comparativaPct: 0,
        costePersonal: 0,
        laborCostPct: 0,
        productividad: 0,
        horasTrabajadas: 0
      };
    }

    const targetDate = dailyResumenData[0].fecha;
    const dayRecords = dailyResumenData.filter((r) => r.fecha === targetDate);

    const totalFacturado = dayRecords.reduce((acc, r) => acc + (Number(r.total_facturado) || 0), 0);
    const numTickets = dayRecords.reduce((acc, r) => acc + (Number(r.num_tickets) || 0), 0);
    const totalEfectivo = dayRecords.reduce((acc, r) => acc + (Number(r.total_efectivo) || 0), 0);
    const totalTarjeta = dayRecords.reduce((acc, r) => acc + (Number(r.total_tarjeta) || 0), 0);
    const ticketMedio = numTickets > 0 ? totalFacturado / numTickets : 0;
    const lastUpdate = dayRecords[0].ultima_actualizacion || new Date().toISOString();

    const horasTrabajadas = dailyWorkedHours[targetDate] || 0;
    const costePersonal = shiftMetrics.dailyCost[targetDate] || 0;
    const laborCostPct = totalFacturado > 0 ? (costePersonal / totalFacturado) * 100 : 0;
    const productividad = horasTrabajadas > 0 ? totalFacturado / horasTrabajadas : 0;

    return {
      totalFacturado,
      numTickets,
      totalEfectivo,
      totalTarjeta,
      ticketMedio,
      ultimaActualizacion: lastUpdate,
      comparativaPct: 12.4,
      costePersonal,
      laborCostPct,
      productividad,
      horasTrabajadas
    };
  };

  const computeHistoricos = () => {
    const semanalMap: Record<string, { tickets: number; ventas: number; horas: number }> = {};
    const mensualMap: Record<string, { tickets: number; ventas: number; horas: number }> = {};
    const anualMap: Record<string, { tickets: number; ventas: number; horas: number }> = {};

    resumenData.forEach((row) => {
      const d = new Date(row.fecha);
      if (Number.isNaN(d.getTime())) return;

      const dateStr = row.fecha; // YYYY-MM-DD
      const horas = dailyWorkedHours[dateStr] || 0;

      const ano = d.getFullYear().toString();
      const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const firstJan = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((d.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);
      const semana = `${ano}-W${String(weekNum).padStart(2, '0')}`;

      const v = Number(row.total_facturado) || 0;
      const t = Number(row.num_tickets) || 0;

      if (!anualMap[ano]) anualMap[ano] = { tickets: 0, ventas: 0, horas: 0 };
      anualMap[ano].tickets += t;
      anualMap[ano].ventas += v;
      anualMap[ano].horas += horas;

      if (!mensualMap[mes]) mensualMap[mes] = { tickets: 0, ventas: 0, horas: 0 };
      mensualMap[mes].tickets += t;
      mensualMap[mes].ventas += v;
      mensualMap[mes].horas += horas;

      if (!semanalMap[semana]) semanalMap[semana] = { tickets: 0, ventas: 0, horas: 0 };
      semanalMap[semana].tickets += t;
      semanalMap[semana].ventas += v;
      semanalMap[semana].horas += horas;
    });

    const formatItems = (map: Record<string, { tickets: number; ventas: number; horas: number }>, prefix = '', limit = 12): HistoricoItem[] => {
      return Object.keys(map)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit)
        .map((key) => {
          const v = map[key].ventas;
          
          // Costes = Materia prima (foodCostPct%) + Personal (horas * hourlyWage)
          const costeMateriaPrima = v * (foodCostPct / 100);
          
          // Sum up shiftMetrics.dailyCost for dates that fall into this period
          let costePersonal = 0;
          Object.keys(shiftMetrics.dailyCost).forEach((dateStr) => {
            const d = new Date(dateStr);
            const ano = d.getFullYear().toString();
            const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const firstJan = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((d.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);
            const semana = `${ano}-W${String(weekNum).padStart(2, '0')}`;

            if (prefix === 'Año ' && key === ano) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            } else if (prefix === '' && key === mes) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            } else if (prefix === 'Semana ' && key === semana) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            }
          });

          const g = costeMateriaPrima + costePersonal;

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

  if (view === 'fichar') {
    return (
      <ClockInView
        locales={localesList}
        onGoToAdmin={() => {
          window.location.hash = '#/admin';
          setView('dashboard');
        }}
      />
    );
  }

  const firstRealLocal = localesList.find(l => l.id !== 'all');
  const selectedLocalId = selectedLocal === 'all' ? (firstRealLocal?.id || 'local_1') : selectedLocal;

  if (!isAdminAuthenticated) {
    return (
      <AdminPinLock
        selectedLocalId={selectedLocalId}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('admin_authenticated', 'true');
        }}
        onGoToFichar={() => {
          window.location.hash = '#/fichar';
          setView('fichar');
        }}
      />
    );
  }
  const totalCobros = kpis.totalEfectivo + kpis.totalTarjeta;
  const pctEfectivo = totalCobros > 0 ? ((kpis.totalEfectivo / totalCobros) * 100).toFixed(0) : '0';
  const pctTarjeta = totalCobros > 0 ? ((kpis.totalTarjeta / totalCobros) * 100).toFixed(0) : '0';

  return (
    <div className="min-h-screen pb-24 md:pb-12">
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
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* ======================================================== */}
        {/* 1. DESKTOP VIEWPORT LAYOUT (Hidden on mobile) */}
        {/* ======================================================== */}
        <div className="hidden md:block space-y-6">
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
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
            </div>
          </div>

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
              title="Coste Personal Est."
              value={`${(kpis.costePersonal || 0).toFixed(2)} €`}
              subtitle={`${(kpis.horasTrabajadas || 0).toFixed(1)}h fichadas | ${(kpis.laborCostPct || 0).toFixed(1)}% ventas`}
              icon={Users}
              color="violet"
            />

            <KPICard
              title="Productividad / Hora"
              value={`${(kpis.productividad || 0).toFixed(2)} €/h`}
              subtitle="Ventas medias por hora-trabajador"
              icon={Zap}
              color="cyan"
            />
          </div>

          <PeriodSummariesSection
            resumenData={resumenData}
            dailyWorkedHours={dailyWorkedHours}
            dailyCost={shiftMetrics.dailyCost}
            foodCostPct={foodCostPct}
          />

          <SalesChart
            ventasHora={ventasHoraData}
            totalEfectivo={kpis.totalEfectivo}
            totalTarjeta={kpis.totalTarjeta}
          />

          <HistoricoSection
            semanal={historico.semanal}
            mensual={historico.mensual}
            anual={historico.anual}
          />

          {/* Módulo Administrador Dual (Cierres vs Control Horario) */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-heading">
                  Gestión de Establecimiento
                </h3>
              </div>
              
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'sales' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cierres Diarios
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('horario')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'horario' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Registro Horario (Fichajes)
                </button>
              </div>
            </div>

            {activeTab === 'sales' ? (
              /* TAB 1: Cierres Diarios (Desktop Table) */
              <div className="overflow-x-auto">
                {dailyResumenData.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-400 uppercase font-semibold">
                        <th className="py-3 px-4">Local</th>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4 text-center">Tickets</th>
                        <th className="py-3 px-4 text-right">Efectivo (€)</th>
                        <th className="py-3 px-4 text-right">Tarjeta (€)</th>
                        <th className="py-3 px-4 text-right font-bold text-slate-200">Total Facturado (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {dailyResumenData.slice(0, 15).map((r) => {
                        const locObj = localesList.find((l) => l.id === r.local_id);
                        const locName = locObj ? locObj.nombre : r.local_id;
                        const rowKey = `${r.local_id}-${r.fecha}`;
                        return (
                          <tr key={rowKey} className="hover:bg-slate-800/40 transition-colors">
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
            ) : (
              /* TAB 2: Control Horario / Fichajes (Desktop Grid) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Manage Employees */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" /> Agregar Trabajador
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label htmlFor="newEmpName" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Nombre Completo</label>
                        <input
                          id="newEmpName"
                          type="text"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="newEmpPin" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">PIN Fichaje (Opcional)</label>
                        <input
                          id="newEmpPin"
                          type="password"
                          value={newEmpPin}
                          onChange={(e) => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="0000"
                          maxLength={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-center font-bold tracking-widest focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEmployee}
                        disabled={!newEmpName.trim()}
                        className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-400" /> Plantilla ({adminEmployees.length})
                    </h4>
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-800/60 pr-1">
                      {adminEmployees.length > 0 ? (
                        adminEmployees.map((emp) => (
                          <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                            <span className={`font-semibold truncate flex-1 ${emp.activo ? 'text-white' : 'text-slate-500 line-through'}`}>{emp.nombre}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={emp.coste_hora ?? ''}
                                  placeholder={hourlyWage.toString()}
                                  onChange={(e) => handleLocalRateChange(emp.id, e.target.value)}
                                  onBlur={(e) => handleSaveEmployeeRate(emp.id, e.target.value === '' ? undefined : Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEmployeeRate(emp.id, e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value));
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-12 bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-0.5 text-[11px] text-center font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-500 font-semibold">€/h</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleEmployeeActive(emp.id, emp.activo)}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {emp.activo ? (
                                  <ToggleRight className="h-5 w-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-slate-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-slate-500 text-[11px]">No hay empleados registrados.</p>
                      )}
                    </div>
                  </div>

                  {/* Resumen Semanal de Pagos */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Coins className="h-4 w-4" /> Pagos Semanales
                      </h4>
                      <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-850 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setWeekOffset((o) => o - 1)}
                          className="px-1.5 py-0.5 hover:bg-slate-800 rounded font-semibold transition-colors"
                        >
                          &lt;
                        </button>
                        <span className="px-2 text-slate-355 font-semibold">
                          {weekOffset === 0 ? 'Esta Sem.' : weekOffset === -1 ? 'Sem. Pasada' : `S${weekOffset}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
                          className="px-1.5 py-0.5 hover:bg-slate-800 rounded font-semibold transition-colors disabled:opacity-30"
                          disabled={weekOffset === 0}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Rango: <span className="font-mono text-slate-200">{weeklyPaymentsData.mondayDate.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span> al <span className="font-mono text-slate-200">{weeklyPaymentsData.sundayDate.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span>
                    </p>

                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 divide-y divide-slate-800/50">
                      {weeklyPaymentsData.list.length > 0 ? (
                        weeklyPaymentsData.list.map((emp) => (
                          <div key={emp.id} className="pt-2 flex items-center justify-between text-xs font-semibold">
                            <div>
                              <span className="text-slate-200 font-bold block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {emp.hours.toFixed(1)}h × {emp.rate.toFixed(1)}€
                              </span>
                            </div>
                            <span className="font-bold text-emerald-400 font-mono text-right">
                              {emp.total.toFixed(2)} €
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-slate-500 text-[10px]">Sin horas trabajadas esta semana.</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-450 font-bold font-mono">
                      <span>Total Liquidación</span>
                      <span className="font-bold text-emerald-400 text-sm font-mono">
                        {weeklyPaymentsData.grandTotal.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Clock-in Logs */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" /> Historial de Registro de Jornada (Últimos 50)
                  </h4>
                  
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    {fichajesList.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                            <th className="py-3 px-4">Trabajador</th>
                            <th className="py-3 px-4 text-center">Acción</th>
                            <th className="py-3 px-4 text-center">Fecha</th>
                            <th className="py-3 px-4 text-right">Hora</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {fichajesList.map((fic) => {
                            const dateObj = new Date(fic.fecha_hora);
                            return (
                              <tr key={fic.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4 text-white font-semibold">{fic.empleados?.nombre || 'Empleado Desconocido'}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    fic.tipo === 'entrada'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  }`}>
                                    {fic.tipo.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-slate-300 font-mono">
                                  {dateObj.toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-300 font-mono">
                                  {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-sm bg-slate-900/20">
                        No hay registros de jornada guardados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. MOBILE VIEWPORT TABBED LAYOUT (Shown on mobile) */}
        {/* ======================================================== */}
        <div className="block md:hidden space-y-4">
          
          {/* TAB 2.1: RESUMEN (KPIs & Payment Methods) */}
          {mobileTab === 'summary' && (
            <div className="space-y-4 animate-fade-in">
              {/* Simplified mobile header info banner */}
              <div className="glass-card p-4 rounded-2xl border border-slate-800 flex justify-between items-center gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">Resumen Consol.</span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Act: <span className="text-slate-300 font-mono">{new Date(kpis.ultimaActualizacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-850 text-[10px] font-mono text-slate-350 flex items-center gap-1 font-semibold">
                    <Calendar className="h-3 w-3 text-indigo-400" />
                    {resumenData[0]?.fecha || 'Hoy'}
                  </span>
                  <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 2 columns compact KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <KPICard
                  title="Facturado"
                  value={`${kpis.totalFacturado.toFixed(1)} €`}
                  subtitle="Ingreso en caja"
                  icon={Euro}
                  color="emerald"
                />

                <KPICard
                  title="Operaciones"
                  value={`${kpis.numTickets}`}
                  subtitle={`Med: ${kpis.ticketMedio.toFixed(1)} €`}
                  icon={Receipt}
                  color="indigo"
                />

                <KPICard
                  title="Personal Est."
                  value={`${(kpis.costePersonal || 0).toFixed(0)} € (${(kpis.laborCostPct || 0).toFixed(0)}%)`}
                  subtitle={`${(kpis.horasTrabajadas || 0).toFixed(1)}h fichadas`}
                  icon={Users}
                  color="violet"
                />

                <KPICard
                  title="Productividad"
                  value={`${(kpis.productividad || 0).toFixed(1)} €/h`}
                  subtitle="Ventas / Hora-trabajo"
                  icon={Zap}
                  color="cyan"
                />
              </div>

              {/* Payment Methods Breakdown Card */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">Distribución de Pagos</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-violet-400">Tarjeta ({pctTarjeta}%)</span>
                      <span className="text-white font-mono">{kpis.totalTarjeta.toFixed(2)} €</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                        style={{ width: `${pctTarjeta}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1">
                      <span className="text-amber-400">Efectivo ({pctEfectivo}%)</span>
                      <span className="text-white font-mono">{kpis.totalEfectivo.toFixed(2)} €</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                        style={{ width: `${pctEfectivo}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <PeriodSummariesSection
                resumenData={resumenData}
                dailyWorkedHours={dailyWorkedHours}
                dailyCost={shiftMetrics.dailyCost}
                foodCostPct={foodCostPct}
              />
            </div>
          )}

          {/* TAB 2.2: GRAFICOS (Hourly Charts & Historical reports) */}
          {mobileTab === 'charts' && (
            <div className="space-y-4 animate-fade-in">
              <SalesChart
                ventasHora={ventasHoraData}
                totalEfectivo={kpis.totalEfectivo}
                totalTarjeta={kpis.totalTarjeta}
              />
              <HistoricoSection
                semanal={historico.semanal}
                mensual={historico.mensual}
                anual={historico.anual}
              />
            </div>
          )}

          {/* TAB 2.3: GESTION (Closures card lists, employee registry, timeline logs) */}
          {mobileTab === 'admin' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Tab Selector pills inside Mobile Management */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    activeTab === 'sales' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cierres Diarios
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('horario')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    activeTab === 'horario' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fichajes / Plantilla
                </button>
              </div>

              {activeTab === 'sales' ? (
                /* TAB 2.3.1: Cierres Diarios Card List */
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">Últimos Cierres de Establecimiento</h4>
                  {dailyResumenData.length > 0 ? (
                    dailyResumenData.slice(0, 15).map((r) => {
                      const locObj = localesList.find((l) => l.id === r.local_id);
                      const locName = locObj ? locObj.nombre : r.local_id;
                      const closureKey = `${r.local_id}-${r.fecha}`;
                      return (
                        <div key={closureKey} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold text-white block">{locName}</span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Punto de venta</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-850 font-mono text-[10px] text-slate-300 font-semibold">
                              {r.fecha}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                            <div>
                              <span className="text-slate-500 block text-[9px] font-semibold uppercase">Efectivo</span>
                              <span className="font-mono text-amber-400 font-bold">{Number(r.total_efectivo).toFixed(1)} €</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] font-semibold uppercase">Tarjeta</span>
                              <span className="font-mono text-violet-400 font-bold">{Number(r.total_tarjeta).toFixed(1)} €</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block text-[9px] font-semibold uppercase">Facturado</span>
                              <span className="font-mono text-emerald-400 font-extrabold text-xs">{Number(r.total_facturado).toFixed(1)} €</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-800/30 text-slate-400">
                            <span>Tickets Emitidos</span>
                            <span className="font-mono text-slate-200 font-bold bg-slate-950/65 px-2 py-0.5 rounded border border-slate-850">{r.num_tickets}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No hay ventas registradas.
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2.3.2: Control de Plantilla & Fichajes list */
                <div className="space-y-4">
                  
                  {/* Employees Management Mobile */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">Gestión de Empleados</h4>
                    
                    {/* Add Employee Compact Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <UserPlus className="h-4 w-4 text-indigo-400" />
                        <span>Agregar Trabajador</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="newEmpNameMob" className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Nombre</label>
                          <input
                            id="newEmpNameMob"
                            type="text"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            placeholder="Ej. Juan P."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="newEmpPinMob" className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">PIN (Opcional)</label>
                          <input
                            id="newEmpPinMob"
                            type="password"
                            value={newEmpPin}
                            onChange={(e) => setNewEmpPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="0000"
                            maxLength={4}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold tracking-widest focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEmployee}
                        disabled={!newEmpName.trim()}
                        className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
                      >
                        Crear Ficha
                      </button>
                    </div>

                    {/* Employee List Horizontal Scroll or visual bubbles */}
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Plantilla ({adminEmployees.length})</span>
                      <div className="max-h-[140px] overflow-y-auto divide-y divide-slate-800/60 pr-1">
                        {adminEmployees.map((emp) => (
                          <div key={emp.id} className="py-2 flex items-center justify-between text-xs gap-3">
                            <span className={`font-semibold truncate flex-1 ${emp.activo ? 'text-white' : 'text-slate-500 line-through'}`}>{emp.nombre}</span>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={emp.coste_hora ?? ''}
                                  placeholder={hourlyWage.toString()}
                                  onChange={(e) => handleLocalRateChange(emp.id, e.target.value)}
                                  onBlur={(e) => handleSaveEmployeeRate(emp.id, e.target.value === '' ? undefined : Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEmployeeRate(emp.id, e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value));
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-11 bg-slate-950 border border-slate-800 rounded-lg px-1 py-0.5 text-[10px] text-center font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[9px] text-slate-500 font-semibold">€/h</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleEmployeeActive(emp.id, emp.activo)}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {emp.activo ? (
                                  <ToggleRight className="h-5 w-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-slate-655" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resumen Semanal de Pagos Mobile */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Coins className="h-4 w-4" /> Pagos Semanales
                      </h4>
                      <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-850 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setWeekOffset((o) => o - 1)}
                          className="px-1.5 py-0.5 hover:bg-slate-800 rounded font-semibold transition-colors"
                        >
                          &lt;
                        </button>
                        <span className="px-2 text-slate-350 font-semibold">
                          {weekOffset === 0 ? 'Esta Sem.' : weekOffset === -1 ? 'Sem. Pasada' : `S${weekOffset}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
                          className="px-1.5 py-0.5 hover:bg-slate-800 rounded font-semibold transition-colors disabled:opacity-30"
                          disabled={weekOffset === 0}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Rango: <span className="font-mono text-slate-200">{weeklyPaymentsData.mondayDate.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span> al <span className="font-mono text-slate-200">{weeklyPaymentsData.sundayDate.toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</span>
                    </p>

                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 divide-y divide-slate-800/50">
                      {weeklyPaymentsData.list.length > 0 ? (
                        weeklyPaymentsData.list.map((emp) => (
                          <div key={emp.id} className="pt-2 flex items-center justify-between text-xs font-semibold">
                            <div>
                              <span className="text-slate-200 font-bold block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {emp.hours.toFixed(1)}h × {emp.rate.toFixed(1)}€
                              </span>
                            </div>
                            <span className="font-bold text-emerald-400 font-mono text-right">
                              {emp.total.toFixed(2)} €
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-slate-500 text-[10px]">Sin horas trabajadas esta semana.</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-450 font-bold font-mono">
                      <span>Total Liquidación</span>
                      <span className="font-bold text-emerald-400 text-sm font-mono">
                        {weeklyPaymentsData.grandTotal.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  {/* Fichajes timeline Mobile */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">Registro de Jornada (Fichajes)</h4>
                    <div className="space-y-2.5">
                      {fichajesList.length > 0 ? (
                        fichajesList.map((fic) => {
                          const dateObj = new Date(fic.fecha_hora);
                          const isEntrada = fic.tipo === 'entrada';
                          return (
                            <div key={fic.id} className="glass-card p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isEntrada ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {isEntrada ? 'E' : 'S'}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-white block truncate max-w-[120px]">{fic.empleados?.nombre || 'Empleado'}</span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5">{dateObj.toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  isEntrada ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                  {fic.tipo.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-slate-350 font-mono block mt-1">
                                  {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No hay registros de jornada.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* ======================================================== */}
      {/* 3. MOBILE FLOATING BOTTOM TAB BAR (Hidden on desktop) */}
      {/* ======================================================== */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden glass-panel border border-slate-800/80 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-around backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setMobileTab('summary')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === 'summary' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="h-5 w-5" />
          <span className="text-[9px] font-semibold">Resumen</span>
          <span className={`h-1 w-1 rounded-full bg-indigo-400 transition-all duration-300 ${
            mobileTab === 'summary' ? 'opacity-100 scale-100 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'opacity-0 scale-50'
          }`} />
        </button>
        
        <button
          type="button"
          onClick={() => setMobileTab('charts')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === 'charts' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw className="h-5 w-5" />
          <span className="text-[9px] font-semibold">Gráficos</span>
          <span className={`h-1 w-1 rounded-full bg-indigo-400 transition-all duration-300 ${
            mobileTab === 'charts' ? 'opacity-100 scale-100 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'opacity-0 scale-50'
          }`} />
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('admin')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === 'admin' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[9px] font-semibold">Gestión</span>
          <span className={`h-1 w-1 rounded-full bg-indigo-400 transition-all duration-300 ${
            mobileTab === 'admin' ? 'opacity-100 scale-100 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'opacity-0 scale-50'
          }`} />
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/fichar';
            setView('fichar');
            setIsAdminAuthenticated(false);
            sessionStorage.removeItem('admin_authenticated');
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
        >
          <Clock className="h-5 w-5 text-rose-450" />
          <span className="text-[9px] font-semibold text-rose-450">Cerrar</span>
          <span className="h-1 w-1 opacity-0 scale-50" />
        </button>
      </div>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {
          setFoodCostPct(Number(localStorage.getItem('app_food_cost_pct') || '30'));
          setHourlyWage(Number(localStorage.getItem('app_hourly_wage') || '10'));
          fetchData();
        }}
      />
    </div>
  );
};

export default App;
