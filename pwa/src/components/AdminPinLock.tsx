import React, { useState } from 'react';
import { Lock, Delete, ArrowLeft } from 'lucide-react';
import { getSupabase } from '../supabaseClient';

interface AdminPinLockProps {
  selectedLocalId: string;
  onSuccess: () => void;
  onGoToFichar: () => void;
}

export const AdminPinLock: React.FC<AdminPinLockProps> = ({ selectedLocalId, onSuccess, onGoToFichar }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleKeyPress = async (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        const supabase = getSupabase();
        if (!supabase) return;
        
        try {
          const { data: isValid, error: rpcError } = await supabase.rpc('verify_admin_pin', {
            local_id: selectedLocalId,
            input_pin: newPin
          });
          
          if (!rpcError && isValid) {
            onSuccess();
          } else {
            setError(true);
            setPin('');
          }
        } catch (e) {
          console.error('Error verifying PIN:', e);
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="glass-card max-w-sm w-full p-8 rounded-3xl border border-slate-800/80 flex flex-col items-center relative">
        <div className={`p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 transition-all ${error ? 'animate-bounce text-rose-400 bg-rose-500/10 border-rose-500/20' : ''}`}>
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold font-heading mb-1 text-center">Acceso Administrador</h2>
        <p className="text-xs text-slate-400 mb-8 text-center">Introduce el PIN de administración para ver la facturación.</p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-10">
          {[0, 1, 2, 3].map((idx) => {
            let indicatorClass = 'border-slate-700 bg-slate-900';
            if (error) {
              indicatorClass = 'border-rose-500 bg-rose-500 animate-pulse';
            } else if (idx < pin.length) {
              indicatorClass = 'border-indigo-400 bg-indigo-400 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
            }
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border transition-all duration-150 ${indicatorClass}`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-rose-400 text-xs font-semibold mb-4 animate-pulse">
            PIN Incorrecto. Inténtalo de nuevo.
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onGoToFichar}
            className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-xs font-semibold text-slate-400 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" /> Fichar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-lg font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-700 border border-slate-800 text-slate-400 transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
