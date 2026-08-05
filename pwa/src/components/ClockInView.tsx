import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import type { Local, Empleado } from '../types';
import { Wifi, WifiOff, ArrowRight, ShieldCheck, CheckCircle2, Lock, HelpCircle } from 'lucide-react';

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
  
  // Network validation states
  const [clientIp, setClientIp] = useState<string>('');
  const [expectedIp, setExpectedIp] = useState<string>('');
  const [checkingIp, setCheckingIp] = useState<boolean>(true);
  const [isIpValid, setIsIpValid] = useState<boolean>(false);
  const [bypassRequired, setBypassRequired] = useState<boolean>(false);
  const [bypassPin, setBypassPin] = useState<string>('');

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

  // Handle clock in / clock out
  const handleFichar = async (tipo: 'entrada' | 'salida') => {
    if (!selectedEmployeeId) {
      setStatusMsg({ type: 'error', text: 'Por favor, selecciona tu nombre.' });
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;

    // PIN check
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

  // Admin PIN bypass handle
  const handleBypass = async () => {
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
          setStatusMsg({ type: 'success', text: 'Verificación de red saltada con autorización.' });
          setTimeout(() => setStatusMsg({ type: '', text: '' }), 2000);
        } else {
          setStatusMsg({ type: 'error', text: 'PIN Administrador incorrecto.' });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeLocales = locales.filter(l => l.id !== 'all');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Top bar */}
      <header className="max-w-7xl mx-auto px-4 py-6 w-full flex items-center justify-between z-10">
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

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
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
          <div className="glass-card max-w-md w-full p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col">
            <h2 className="text-xl font-bold font-heading mb-1 text-center">Fichar Entrada / Salida</h2>
            <p className="text-xs text-slate-400 mb-6 text-center">Registra el inicio o fin de tu jornada de trabajo.</p>

            {/* Select Local */}
            <div className="space-y-1.5 mb-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Establecimiento</span>
              <select
                value={selectedLocalId}
                onChange={(e) => {
                  setSelectedLocalId(e.target.value);
                  setSelectedEmployeeId('');
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {activeLocales.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>

            {/* Network Validation Banner */}
            <div className="mb-6">
              {checkingIp ? (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                  Verificando conexión con el local...
                </div>
              ) : isIpValid ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 text-xs text-emerald-400">
                  <Wifi className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <span className="font-semibold block">Red Autorizada (Wi-Fi Local)</span>
                    <span className="text-[10px] text-emerald-500/70">Tu conexión coincide con el establecimiento.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-3 text-xs text-rose-400">
                    <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-400">Conexión Denegada</span>
                      <span className="text-[10px] text-rose-400/80 block mt-0.5 leading-relaxed">
                        Debes estar conectado a la red Wi-Fi del restaurante para poder fichar.
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-2 font-mono">
                        Tu IP: {clientIp || 'Detectando...'} | Wi-Fi Local: {expectedIp || 'No configurada'}
                      </span>
                    </div>
                  </div>

                  {bypassRequired ? (
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">PIN del Administrador para saltar verificación</span>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={bypassPin}
                          onChange={(e) => setBypassPin(e.target.value)}
                          placeholder="••••"
                          maxLength={4}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-sm font-bold tracking-widest focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleBypass}
                          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Autorizar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBypassRequired(true)}
                      className="text-[10px] font-medium text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                    >
                      <HelpCircle className="h-3 w-3" /> Saltar verificación por red (Solo Admin)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Select Employee */}
            {isIpValid && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Selecciona tu Nombre</span>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">-- Elige tu Nombre --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* PIN Code entry if employee pin is required */}
                {selectedEmployeeId && employees.find(e => e.id === selectedEmployeeId)?.pin_empleado !== '0000' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Introduce tu PIN de Fichaje</span>
                    <input
                      type="password"
                      value={employeePin}
                      onChange={(e) => setEmployeePin(e.target.value.replace(/\D/g, ''))}
                      maxLength={4}
                      placeholder="••••"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-center text-sm font-bold tracking-widest focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {statusMsg.type === 'error' && (
                  <p className="text-rose-400 text-xs font-semibold text-center mt-2 animate-pulse">
                    {statusMsg.text}
                  </p>
                )}

                {/* Clock-in / Clock-out buttons */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleFichar('entrada')}
                    disabled={loading}
                    className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-bold transition-all text-white flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFichar('salida')}
                    disabled={loading}
                    className="py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold transition-all text-white flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-[10px] text-slate-600">
        &copy; {new Date().getFullYear()} ERP Restaurante. Todos los derechos reservados.
      </footer>
    </div>
  );
};
