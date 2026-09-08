import { createClient, SupabaseClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(envUrl && envKey);

const supabaseInstance: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envUrl, envKey)
  : null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
  return supabaseInstance;
};

