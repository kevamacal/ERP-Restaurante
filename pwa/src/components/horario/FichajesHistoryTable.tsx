import React from "react";
import { FileText, Trash2 } from "lucide-react";

interface FichajesHistoryTableProps {
  fichajesList: any[];
  requestDeleteFichaje: (fic: any) => void;
}

export const FichajesHistoryTable: React.FC<FichajesHistoryTableProps> = ({
  fichajesList,
  requestDeleteFichaje,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-400" /> Historial de Registro de Jornada ({fichajesList.length})
        </h4>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-transparent">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
              <th className="py-3 px-4">Trabajador</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Fecha</th>
              <th className="py-3 px-4">Hora</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {fichajesList.length > 0 ? (
              fichajesList.map((fic) => {
                const dateObj = new Date(fic.fecha_hora);
                const isEntrada = fic.tipo === "entrada";
                return (
                  <tr key={fic.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                      {fic.empleados?.nombre || "Desconocido"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isEntrada
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {fic.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {dateObj.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {dateObj.toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => requestDeleteFichaje(fic)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                        title="Eliminar registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 text-sm bg-slate-900/20">
                  No hay registros de jornada cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Timeline */}
      <div className="md:hidden space-y-2.5">
        {fichajesList.length > 0 ? (
          fichajesList.map((fic) => {
            const dateObj = new Date(fic.fecha_hora);
            const isEntrada = fic.tipo === "entrada";
            return (
              <div
                key={fic.id}
                className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isEntrada
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {isEntrada ? "E" : "S"}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                      {fic.empleados?.nombre || "Desconocido"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dateObj.toLocaleDateString()}{" "}
                      {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestDeleteFichaje(fic)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-center py-6 text-slate-500 text-xs">
            Sin fichajes registrados.
          </p>
        )}
      </div>
    </div>
  );
};
