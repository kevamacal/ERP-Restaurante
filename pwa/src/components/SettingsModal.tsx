import React, { useState } from 'react';
import { X, Key, Globe, Check, AlertCircle, Save, Trash2 } from 'lucide-react';
import { saveSupabaseCredentials, clearSupabaseCredentials, getSupabase } from '../supabaseClient';

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
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || '');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) {
      setStatus({ type: 'error', msg: 'Por favor completa la URL y la API Key de Supabase.' });
      return;
    }

    try {
      saveSupabaseCredentials(url, key);
      const client = getSupabase();
      if (!client) throw new Error('No se pudo inicializar el cliente Supabase.');

      const { error } = await client.from('locales').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') {
        setStatus({ type: 'error', msg: `Conexión a Supabase con aviso: ${error.message}` });
      } else {
        setStatus({ type: 'success', msg: '¡Conexión exitosa a Supabase!' });
      }

      onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', msg: `Error al probar conexión: ${err.message || err}` });
    }
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setKey('');
    setStatus({ type: 'success', msg: 'Credenciales eliminadas. Cambiado a Modo Demo.' });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700/60 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-white font-heading mb-1">
          Configuración de Supabase
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Ingresa tus credenciales del proyecto de Supabase para activar la recepción de métricas en tiempo real.
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-400" /> Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-indigo-400" /> Supabase Anon / Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2.5 rounded-xl border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Usar Modo Demo
            </button>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Conexión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
