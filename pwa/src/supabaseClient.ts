import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getStoredUrl = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  return localStorage.getItem('supabase_url') || '';
};

const getStoredKey = (): string => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  return localStorage.getItem('supabase_key') || '';
};

export const isSupabaseConfigured = Boolean(envUrl || envKey || getStoredUrl() || getStoredKey());

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
};

export const clearSupabaseCredentials = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
};

export const getSupabase = () => {
  const url = envUrl || getStoredUrl();
  const key = envKey || getStoredKey();

  if (!url || !key) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY o credenciales guardadas en localStorage');
    return null;
  }

  return createClient(url, key);
};
