/**
 * PLANTILLA de hook de dominio.
 *
 * Copia la estructura, no el contenido. Adapta nombres y tabla.
 * ⚠ No copies el bloque inline de resolución de empresa que usan hoy
 *   useDashboardData / useEmployeeManagement / useFichajesManagement /
 *   useGastosManagement: está duplicado 4 veces y por eso puede fallar.
 *   Crea o reutiliza un helper compartido.
 *
 * Ubicación: pwa/src/hooks/use<Entidad>Management.ts
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../supabaseClient';
import type { <Entidad> } from '../types';

/** Estado de una operación de escritura, para feedback en la UI. */
type Status = { type: 'idle' } | { type: 'loading' } | { type: 'error'; msg: string };

interface Use<Entidad>Management {
  /** Lista de la entidad de la empresa activa. Vacía si no hay sesión. */
  items: <Entidad>[];
  /** true solo durante la carga inicial. Consúmelo en el componente. */
  isLoading: boolean;
  /** true cuando el usuario no ha iniciado sesión. */
  isSignedOut: boolean;
  /** Último error de la carga inicial, o null. */
  errorMsg: string | null;
  /** Estado de la última escritura. Léelo en un aria-live. */
  status: Status;

  /** Vuelve a pedir los datos. Úsalo tras una mutación. */
  refetch: () => Promise<void>;
  /** Elimina por id. Nunca borra nada si no confirma. */
  remove: (id: string) => Promise<boolean>;
}

export const use<Entidad>Management = (): Use<Entidad>Management => {
  const [items, setItems] = useState<<Entidad>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setErrorMsg('Supabase no está configurado (revisa las variables de entorno).');
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setErrorMsg(sessionError.message);
        return;
      }

      const session = sessionData.session;
      if (!session) {
        setIsSignedOut(true);
        setItems([]);
        return;
      }
      setIsSignedOut(false);

      // ⚠ Resuelve la empresa con el helper compartido, no con el bloque inline.
      const empresaId = await resolveEmpresaId(supabase, session.user.id);
      if (!empresaId) {
        setErrorMsg('El usuario no tiene ninguna empresa asignada.');
        return;
      }

      // ⚠ SIEMPRE filtra por empresa_id. Sin este filtro la consulta
      //   devuelve los datos de todos los tenants.
      const { data, error } = await supabase
        .from('<tabla>')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('<columna_orden>', { ascending: false });

      // ⚠ Revisa el error. El patrón mayoritario del repo lo ignora.
      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setItems((data ?? []) as <Entidad>[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const supabase = getSupabase();
      if (!supabase) return false;

      setStatus({ type: 'loading' });

      const { error } = await supabase.from('<tabla>').delete().eq('id', id);

      if (error) {
        setStatus({ type: 'error', msg: error.message });
        return false;
      }

      setStatus({ type: 'idle' });
      await fetchItems();
      return true;
    },
    [fetchItems],
  );

  return { items, isLoading, isSignedOut, errorMsg, status, refetch: fetchItems, remove };
};
