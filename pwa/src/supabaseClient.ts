import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && key);

export const getSupabase = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!envUrl || !envKey) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    return null;
  }
  
  return createClient(envUrl, envKey);
};
