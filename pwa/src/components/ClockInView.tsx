import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import type { Local, Empleado } from '../types';
import { Wifi, WifiOff, ArrowRight, ShieldCheck, CheckCircle2, Lock, HelpCircle, Search, Store, Delete, X } from 'lucide-react';

interface ClockInViewProps {
  locales: Local[];
  onGoToAdmin: () => void;
}

export const ClockInView: React.FC<ClockInViewProps> = ({ locales, onGoToAdmin }) => {
  const [selectedLocalId, setSelectedLocalId] = useState<string>('');
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeePin, setEmployeePin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  
  // Search query for employees
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Network validation states
  const [clientIp, setClientIp] = useState<string>('');
  const [expectedIp, setExpectedIp] = useState<string>('');
  const [checkingIp, setCheckingIp] = useState<boolean>(true);
  const [isIpValid, setIsIpValid] = useState<boolean>(false);
  const [bypassRequired, setBypassRequired] = useState<boolean>(false);
  const [bypassPin, setBypassPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // Set default local on load
  useEffect(() => {
    const activeLocales = locales.filter(l => l.id !== 'all');
    if (activeLocales.length > 0) {
      setSelectedLocalId(activeLocales[0].id);
    }
  }, [locales]);

  // Load employees for selected local
  useEffect(() => {
    if (!selectedLocalId) return;

    const fetchEmployees = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('*')
          .eq('local_id', selectedLocalId)
          .eq('activo', true)
          .order('nombre');

        if (!error && data) {
          setEmployees(data);
        }
      } catch (e) {
        console.error('Error fetching employees:', e);
      }
    };

    fetchEmployees();
  }, [selectedLocalId]);

  // Validate IP network
  useEffect(() => {
    if (!selectedLocalId) return;

    const validateNetwork = async () => {
      setCheckingIp(true);
      const supabase = getSupabase();
      if (!supabase) {
        setCheckingIp(false);
        return;
      }

      try {
        // 1. Get client IP
        const resIp = await fetch('https://api.ipify.org?format=json');
        const ipData = await resIp.json();
        const detectedClientIp = ipData.ip || '';
        setClientIp(detectedClientIp);

        // 2. Get local expected IP from Supabase
        const { data, error } = await supabase
          .from('locales')
          .select('ip_publica')
          .eq('id', selectedLocalId)
          .single();

        if (!error && data) {
          const localIp = data.ip_publica || '';
          setExpectedIp(localIp);
          
          // IP matches, or if no IP is configured yet in DB (to allow initial setup)
          if (!localIp || detectedClientIp === localIp) {
            setIsIpValid(true);
          } else {
            setIsIpValid(false);
          }
        } else {
          setIsIpValid(true); // default true if local record doesn't exist
        }
      } catch (e) {
        console.error('Error checking IP network:', e);
        setIsIpValid(true); // Fail-safe to allow clocking in if ipify is down
      }
      setCheckingIp(false);
    };

    validateNetwork();
  }, [selectedLocalId]);

  // Validate employee PIN automatically
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;

    const requiresPin = employee.pin_empleado && employee.pin_empleado !== '0000';
    if (!requiresPin) return;

    if (employeePin.length === 4) {
      if (employeePin === employee.pin_empleado) {
        setPinError(false);
      } else {
        setPinError(true);
        // Play device vibration if supported (haptic feedback for error)
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => {
          setEmployeePin('');
          setPinError(false);
        }, 1000);
      }
    }
  }, [employeePin, selectedEmployeeId, employees]);

  // Validate admin bypass PIN automatically
  useEffect(() => {
    if (!bypassRequired) return;
    if (bypassPin.length === 4) {
      const validateAdminBypass = async () => {
        const supabase = getSupabase();
        if (!supabase || !selectedLocalId) return;

        try {
          const { data, error } = await supabase
            .from('locales')
            .select('pin_admin')
            .eq('id', selectedLocalId)
            .single();

          if (!error && data) {
            const correctAdminPin = data.pin_admin || '1234';
            if (bypassPin === correctAdminPin) {
              setIsIpValid(true);
              setBypassRequired(false);
              setBypassPin('');
              setStatusMsg({ type: 'success', text: 'Verificación de red saltada con autorización.' });
              setTimeout(() => setStatusMsg({ type: '', text: '' }), 2500);
            } else {
              setPinError(true);
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              setTimeout(() => {
                setBypassPin('');
                setPinError(false);
              }, 1000);
            }
          }
        } catch (e) {
          console.error(e);
          setPinError(true);
          setTimeout(() => {
            setBypassPin('');
            setPinError(false);
          }, 1000);
        }
      };
      validateAdminBypass();
    }
  }, [bypassPin, bypassRequired, selectedLocalId]);

  // Handle clock in / clock out
  const handleFichar = async (tipo: 'entrada' | 'salida') => {
    if (!selectedEmployeeId) {
      setStatusMsg({ type: 'error', text: 'Por favor, selecciona tu nombre.' });
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;

    // Double-check PIN match
    if (employee.pin_empleado && employee.pin_empleado !== '0000' && employeePin !== employee.pin_empleado) {
      setStatusMsg({ type: 'error', text: 'PIN de empleado incorrecto.' });
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('fichajes')
        .insert([
          {
            empleado_id: selectedEmployeeId,
            tipo: tipo
          }
        ]);

      if (!error) {
        // Success haptic feedback
        if (navigator.vibrate) navigator.vibrate(60);

        setStatusMsg({
          type: 'success',
          text: `¡Fichaje de ${tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'} registrado correctamente para ${employee.nombre}!`
        });
        setEmployeePin('');
        setSelectedEmployeeId('');
        
        // Auto clear success message after 3.5s
        setTimeout(() => {
          setStatusMsg({ type: '', text: '' });
        }, 3500);
      } else {
        setStatusMsg({ type: 'error', text: `Error al guardar: ${error.message}` });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Error: ${e.message || e}` });
    }
    setLoading(false);
  };

  const handleKeypadPress = (num: string) => {
    if (navigator.vibrate) navigator.vibrate(20); // Small haptic tap
    setPinError(false);

    if (bypassRequired && bypassPin.length < 4) {
      setBypassPin(prev => prev + num);
    } else if (!bypassRequired && employeePin.length < 4) {
      setEmployeePin(prev => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setPinError(false);

    if (bypassRequired) {
      setBypassPin(prev => prev.slice(0, -1));
    } else {
      setEmployeePin(prev => prev.slice(0, -1));
    }
  };

  const activeLocales = locales.filter(l => l.id !== 'all');

  // Filter employees list based on search
  const filteredEmployees = employees.filter(emp => 
    emp.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const requiresPin = selectedEmployee?.pin_empleado && selectedEmployee.pin_empleado !== '0000';
  const pinIsCorrect = selectedEmployee && (!requiresPin || employeePin === selectedEmployee.pin_empleado);

  const renderNetworkBanner = () => {
    if (checkingIp) {
      return (
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-850 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          Verificando conexión con el local...
        </div>
      );
    }
    if (isIpValid) {
      return (
        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 text-xs text-emerald-400">
          <Wifi className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <span className="font-semibold block">Red Autorizada (Wi-Fi Local)</span>
            <span className="text-[10px] text-emerald-500/70">Coincide con la red del local.</span>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-3 text-xs text-rose-400">
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-rose-400">Conexión Denegada</span>
            <span className="text-[10px] text-rose-400/80 block mt-0.5 leading-relaxed">
              Conéctate al Wi-Fi del restaurante para poder fichar.
            </span>
            <span className="text-[9px] text-slate-500 block mt-1.5 font-mono">
              Tu IP: {clientIp || '...'} | Requerida: {expectedIp || 'No config'}
            </span>
          </div>
        </div>

        {bypassRequired ? (
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-850 flex flex-col items-center">
            <div className="flex w-full items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIN del Administrador</span>
              <button 
                type="button"
                onClick={() => setBypassRequired(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 w-full justify-center mb-3">
              {[0, 1, 2, 3].map((idx) => {
                let indClass = 'border-slate-800 bg-slate-950';
                if (pinError) {
                  indClass = 'border-rose-500 bg-rose-500/40 animate-pulse';
                } else if (idx < bypassPin.length) {
                  indClass = 'border-indigo-400 bg-indigo-500';
                }
                return (
                  <div key={idx} className={`h-3 w-3 rounded-full border ${indClass}`} />
                );
              })}
            </div>
            
            {/* Virtual Keypad for Bypass inline */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-400 transition-all flex items-center justify-center cursor-pointer"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBypassRequired(true);
              setBypassPin('');
            }}
            className="text-[10px] font-medium text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto transition-colors cursor-pointer"
          >
            <HelpCircle className="h-3 w-3" /> Saltar verificación por red (Solo Admin)
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Top bar */}
      <header className="max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            H
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">ERP Restaurante</h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Registro de Jornada</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToAdmin}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-slate-300"
        >
          <Lock className="h-3 w-3 text-indigo-400" />
          Dashboard Admin
        </button>
      </header>

      {/* Main card container */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-8 z-10">
        {statusMsg.type === 'success' ? (
          /* Success View */
          <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-slate-800 text-center flex flex-col items-center animate-fade-in">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="h-10 w-10 animate-scale-up" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">¡Fichaje Completado!</h2>
            <p className="text-sm text-slate-300 mb-6 max-w-xs">{statusMsg.text}</p>
            <span className="text-xs text-slate-500 font-mono">
              Registrado a las: {new Date().toLocaleTimeString()}
            </span>
          </div>
        ) : (
          /* Work Clock-in form */
          <div className="glass-card max-w-md w-full p-5 sm:p-7 rounded-3xl border border-slate-800 flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold font-heading mb-1 text-center">Fichar Entrada / Salida</h2>
            <p className="text-[11px] text-slate-400 mb-5 text-center">Selecciona tu establecimiento y toca tu nombre.</p>

            {/* Select Local (Visual Tabs instead of dropdown) */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Establecimiento</span>
              <div className="flex bg-slate-900 border border-slate-855 p-1 rounded-xl overflow-x-auto gap-1">
                {activeLocales.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocalId(l.id);
                      setSelectedEmployeeId('');
                      setSearchQuery('');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedLocalId === l.id
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                    {l.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Validation Banner */}
            <div className="mb-5">
              {renderNetworkBanner()}
            </div>

            {/* Select Employee Visual Grid with Search Filter */}
            {isIpValid && (
              <div className="space-y-3 animate-fade-in flex-1 flex flex-col">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Busca tu Nombre</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Escribe para buscar..."
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="max-h-[220px] overflow-y-auto grid grid-cols-2 gap-2 pr-1 mt-1">
                  {filteredEmployees.map((emp) => {
                    const initials = emp.nombre
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    const colors = [
                      'bg-gradient-to-tr from-indigo-500/10 to-indigo-500/20 border-indigo-500/30 text-indigo-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
                      'bg-gradient-to-tr from-emerald-500/10 to-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
                      'bg-gradient-to-tr from-violet-500/10 to-violet-500/20 border-violet-500/30 text-violet-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
                      'bg-gradient-to-tr from-amber-500/10 to-amber-500/20 border-amber-500/30 text-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
                      'bg-gradient-to-tr from-cyan-500/10 to-cyan-500/20 border-cyan-500/30 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                    ];
                    const colorIdx = ((emp.nombre.codePointAt(0) || 0)) % colors.length;
                    const colorClass = colors[colorIdx];

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setEmployeePin('');
                          setStatusMsg({ type: '', text: '' });
                        }}
                        className="p-2.5 rounded-xl border border-slate-850 bg-slate-900/50 hover:bg-slate-800/80 hover:border-indigo-500/30 active:scale-95 text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                      >
                        <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] border shadow-sm ${colorClass}`}>
                          {initials}
                        </div>
                        <span className="text-[11px] font-semibold text-white truncate leading-none">{emp.nombre}</span>
                      </button>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <p className="col-span-2 text-center text-slate-500 text-xs py-8">
                      No hay empleados activos en esta sucursal.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Keypad Overlay for Workers PIN & Action */}
      {selectedEmployee && statusMsg.type !== 'success' && (
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
                <p className="text-xs text-slate-400 mb-5 text-center">Introduce tu PIN para continuar</p>
                
                {/* 4 dots showing PIN input progress */}
                <div className={`flex gap-4 mb-8 ${pinError ? 'animate-shake' : ''}`}>
                  {[0, 1, 2, 3].map((idx) => {
                    let indicatorClass = 'border-slate-800 bg-slate-900';
                    if (pinError) {
                      indicatorClass = 'border-rose-500 bg-rose-500/40 animate-pulse';
                    } else if (idx < employeePin.length) {
                      indicatorClass = 'border-indigo-400 bg-indigo-500 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
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
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
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
                    onClick={() => {
                      setSelectedEmployeeId('');
                      setEmployeePin('');
                    }}
                    className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-90 border border-slate-900 text-xs font-semibold text-rose-400 transition-all flex items-center justify-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/30 active:scale-90 active:bg-indigo-600 border border-slate-855 text-lg font-bold transition-all flex items-center justify-center cursor-pointer text-white"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadDelete}
                    className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-850 hover:border-indigo-500/30 active:scale-90 active:bg-slate-800 border border-slate-850 text-slate-400 transition-all flex items-center justify-center cursor-pointer"
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
                    onClick={() => handleFichar('entrada')}
                    disabled={loading}
                    className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-extrabold transition-all text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <ShieldCheck className="h-5 w-5" />
                    MARCAR ENTRADA
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFichar('salida')}
                    disabled={loading}
                    className="w-full py-5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-sm font-extrabold transition-all text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <ArrowRight className="h-5 w-5" />
                    MARCAR SALIDA
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeId('');
                    setEmployeePin('');
                  }}
                  className="mt-6 text-xs text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
                >
                  Cambiar de empleado / Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="py-4 sm:py-6 text-center text-[10px] text-slate-600">
        &copy; {new Date().getFullYear()} ERP Restaurante. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default ClockInView;

