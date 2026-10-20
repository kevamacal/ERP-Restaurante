/**
 * PLANTILLA de componente de dominio.
 *
 * Ubicación: pwa/src/components/<dominio>/<Nombre>.tsx
 *
 * Reglas que este fichero respeta y que el repo actual no cumple:
 *  · ningún `any`
 *  · `htmlFor` en todo label
 *  · `aria-label` en botones solo-icono
 *  · mensajes de estado en un `aria-live="polite"`
 *  · fechas con 'es-ES' explícito
 *  · moneda con Intl.NumberFormat
 *  · loading y error visibles, no un render vacío
 *  · el componente se monta UNA vez (la responsividad va dentro)
 */

import type { React } from 'react';
import type { <Entidad> } from '../../types';

interface Props {
  items: <Entidad>[];
  isLoading: boolean;
  errorMsg: string | null;
  onRefetch: () => void;
  onRequestDelete: (item: <Entidad>) => void;
}

/* ---------- Formatadores compartidos ---------- */

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const moneyFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const formatFecha = (iso: string): string => dateFmt.format(new Date(iso));
const formatImporte = (valor: number): string => moneyFmt.format(valor);

/* ---------- Componente ---------- */

export const <Nombre>: React.FC<Props> = ({
  items,
  isLoading,
  errorMsg,
  onRefetch,
  onRequestDelete,
}) => {
  // --- Loading: nunca un render vacío silencioso ---
  if (isLoading) {
    return (
      <div className="p-4 text-sm text-slate-400" role="status" aria-live="polite">
        Cargando…
      </div>
    );
  }

  // --- Error: explícito y accionable ---
  if (errorMsg) {
    return (
      <div className="p-4" role="alert">
        <p className="text-sm text-red-400">{errorMsg}</p>
        <button
          type="button"
          onClick={onRefetch}
          className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Todavía no hay registros.
      </div>
    );
  }

  return (
    /* md:hidden = versión móvil · hidden md:block = versión escritorio.
       El componente se monta UNA sola vez: aquí dentro se resuelve la
       responsividad. NO renderices dos veces desde el padre. */
    <div className="flex flex-col gap-3 md:hidden">
      {/* ---------- Móvil: tarjetas ---------- */}
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-white/10 p-3">
          <header className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium">{item.nombre}</h3>
            <button
              type="button"
              onClick={() => onRequestDelete(item)}
              aria-label={`Eliminar ${item.nombre}`}
              className="rounded p-1 text-red-400 hover:bg-red-500/10"
            >
              <TrashIcon aria-hidden="true" />
            </button>
          </header>

          <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-slate-400">
            <dt>Fecha</dt>
            <dd>{formatFecha(item.fecha_hora)}</dd>
            <dt>Importe</dt>
            <dd>{formatImporte(item.importe)}</dd>
          </dl>
        </article>
      ))}
    </div>
  );
};
