import React from "react";
import type { Gasto } from "../../types";
import { FileText, Trash2 } from "lucide-react";

interface GastosTableProps {
  gastosList: Gasto[];
  requestDeleteGasto: (gasto: Gasto) => void;
  isGastosTableMissing: boolean;
}

export const GastosTable: React.FC<GastosTableProps> = ({
  gastosList,
  requestDeleteGasto,
  isGastosTableMissing,
}) => {
  return (
    <div className="space-y-4">
      {/* Desktop Table Header */}
      <div className="hidden md:flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-400" /> Registro de Gastos y Facturas ({gastosList.length})
        </h4>
        {isGastosTableMissing && (
          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            Modo Local (Sin tabla Supabase)
          </span>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-transparent">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Proveedor / Origen</th>
              <th className="py-3 px-4">Concepto</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Importe</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {gastosList.length > 0 ? (
              gastosList.map((g) => {
                const isIngreso =
                  g.tipo === "ingreso" || g.categoria === "Ingreso / Bonificación";
                return (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                      {g.fecha}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {g.proveedor || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {g.concepto}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isIngreso
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {g.categoria}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${
                        isIngreso
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {isIngreso ? "+" : "-"}
                      {g.importe.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => requestDeleteGasto(g)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-slate-400 text-sm bg-slate-900/20"
                >
                  No hay registros de gastos ni facturas agregados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">
          Registro de Gastos e Ingresos ({gastosList.length})
        </h4>
        <div className="space-y-2.5">
          {gastosList.length > 0 ? (
            gastosList.map((g) => {
              const isIngreso =
                g.tipo === "ingreso" || g.categoria === "Ingreso / Bonificación";
              return (
                <div
                  key={g.id}
                  className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-850 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        {g.concepto}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isIngreso
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {g.categoria}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                      {g.fecha} {g.proveedor ? `• ${g.proveedor}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold text-xs ${
                        isIngreso
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {isIngreso ? "+" : "-"}
                      {g.importe.toFixed(2)} €
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteGasto(g)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-6 text-slate-500 text-xs">
              Sin gastos ni ingresos agregados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
