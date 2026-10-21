import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { DailyTableRow } from "../../utils/analytics";
import {
  formatCurrency,
  formatDateEs,
  formatNumber,
  formatPercentFromRatio,
  formatSignedPercentFromRatio,
} from "../../utils/format";

interface DailyTableProps {
  rows: DailyTableRow[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export const DailyTable: React.FC<DailyTableProps> = ({
  rows,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left border-collapse text-[11px]">
          <caption className="sr-only">
            Detalle diario de facturación, tickets, cobros y pendiente.
          </caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[9px] tracking-wider">
              <th scope="col" className="py-2.5 px-2 sticky left-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur z-10">
                Fecha
              </th>
              <th scope="col" className="py-2.5 px-2 text-right">Facturado</th>
              <th scope="col" className="py-2.5 px-2 text-right">Tickets</th>
              <th scope="col" className="py-2.5 px-2 text-right">Ticket medio</th>
              <th scope="col" className="py-2.5 px-2 text-right">Efectivo</th>
              <th scope="col" className="py-2.5 px-2 text-right">Tarjeta</th>
              <th scope="col" className="py-2.5 px-2 text-right">Pendiente</th>
              <th scope="col" className="py-2.5 px-2 text-right">% Efe/Tar</th>
              <th scope="col" className="py-2.5 px-2 text-right">vs media día</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  {loading ? "Cargando días…" : "No hay días con ventas en este rango."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const variation = row.variacionMedia;
                const variationClass =
                  variation === null
                    ? "text-slate-400"
                    : variation >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400";

                return (
                  <tr
                    key={row.fecha}
                    className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors"
                    title={
                      row.ultimaActualizacion
                        ? `Última actualización: ${new Date(row.ultimaActualizacion).toLocaleString("es-ES")}`
                        : undefined
                    }
                  >
                    <th
                      scope="row"
                      className="py-2 px-2 sticky left-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur z-10 font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                    >
                      <span className="font-mono">{formatDateEs(row.fecha)}</span>
                      <span className="ml-1.5 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                        {row.diaSemana}
                      </span>
                    </th>
                    <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.facturado)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{formatNumber(row.tickets)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(row.ticketMedio)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(row.efectivo)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(row.tarjeta)}</td>
                    <td className="py-2 px-2 text-right font-mono text-amber-600 dark:text-amber-400">
                      {formatCurrency(row.pendiente)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {formatPercentFromRatio(row.efectivoShare)} / {formatPercentFromRatio(row.tarjetaShare)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-semibold ${variationClass}`}>
                      {formatSignedPercentFromRatio(variation)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando…
            </span>
          ) : total === 0 ? (
            "Sin días"
          ) : (
            `Mostrando ${start}–${end} de ${formatNumber(total)} días`
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-[10px]">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
