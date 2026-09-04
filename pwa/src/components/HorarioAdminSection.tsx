import React from "react";
import type { Empleado } from "../types";
import {
  UserPlus,
  Clock,
  Users,
  ToggleLeft,
  ToggleRight,
  Coins,
  FileText,
  Trash2,
} from "lucide-react";

interface HorarioAdminSectionProps {
  adminEmployees: Empleado[];
  newEmpName: string;
  setNewEmpName: (val: string) => void;
  newEmpPin: string;
  setNewEmpPin: (val: string) => void;
  handleAddEmployee: () => void;
  manualEmpId: string;
  setManualEmpId: (val: string) => void;
  manualTipo: "entrada" | "salida";
  setManualTipo: (val: "entrada" | "salida") => void;
  manualFechaHora: string;
  setManualFechaHora: (val: string) => void;
  handleAddManualFichaje: () => void;
  handleToggleEmployeeActive: (id: string, active: boolean) => void;
  handleLocalRateChange: (id: string, val: string) => void;
  handleSaveEmployeeRate: (id: string, val: number | undefined) => void;
  hourlyWage: number;
  weeklyPaymentsData: {
    mondayDate: Date;
    sundayDate: Date;
    list: Array<{ id: string; name: string; hours: number; rate: number; total: number }>;
    grandTotal: number;
  };
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  fichajesList: any[];
  requestDeleteFichaje: (fic: any) => void;
}

export const HorarioAdminSection: React.FC<HorarioAdminSectionProps> = ({
  adminEmployees,
  newEmpName,
  setNewEmpName,
  newEmpPin,
  setNewEmpPin,
  handleAddEmployee,
  manualEmpId,
  setManualEmpId,
  manualTipo,
  setManualTipo,
  manualFechaHora,
  setManualFechaHora,
  handleAddManualFichaje,
  handleToggleEmployeeActive,
  handleLocalRateChange,
  handleSaveEmployeeRate,
  hourlyWage,
  weeklyPaymentsData,
  weekOffset,
  setWeekOffset,
  fichajesList,
  requestDeleteFichaje,
}) => {
  return (
    <>
      {/* DESKTOP VIEW */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Manage Employees */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" /> Agregar Trabajador
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="newEmpName"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  Nombre Completo
                </label>
                <input
                  id="newEmpName"
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="newEmpPin"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  PIN Fichaje (Opcional)
                </label>
                <input
                  id="newEmpPin"
                  type="password"
                  value={newEmpPin}
                  onChange={(e) =>
                    setNewEmpPin(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0000"
                  maxLength={4}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-center font-bold tracking-widest text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddEmployee}
                disabled={!newEmpName.trim()}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Registrar Fichaje Manual (Desktop) */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Registrar Fichaje Manual
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="manualEmp"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  Empleado
                </label>
                <select
                  id="manualEmp"
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                >
                  <option value="">Selecciona un empleado...</option>
                  {adminEmployees
                    .filter((e) => e.activo)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Tipo de Evento
                </label>
                <div className="flex bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setManualTipo("entrada")}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${manualTipo === "entrada"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualTipo("salida")}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${manualTipo === "salida"
                      ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    Salida
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="manualFechaHora"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  Fecha y Hora
                </label>
                <input
                  id="manualFechaHora"
                  type="datetime-local"
                  value={manualFechaHora}
                  onChange={(e) => setManualFechaHora(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleAddManualFichaje}
                disabled={!manualEmpId || !manualFechaHora}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
              >
                Registrar Fichaje
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-indigo-400" /> Plantilla (
              {adminEmployees.length})
            </h4>
            <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60 pr-1">
              {adminEmployees.length > 0 ? (
                adminEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="py-2.5 flex items-center justify-between text-xs gap-3"
                  >
                    <span
                      className={`font-semibold truncate flex-1 ${emp.activo ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}
                    >
                      {emp.nombre}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={emp.coste_hora ?? ""}
                          placeholder={hourlyWage.toString()}
                          onChange={(e) =>
                            handleLocalRateChange(emp.id, e.target.value)
                          }
                          onBlur={(e) =>
                            handleSaveEmployeeRate(
                              emp.id,
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEmployeeRate(
                                emp.id,
                                e.currentTarget.value === ""
                                  ? undefined
                                  : Number(e.currentTarget.value)
                              );
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-12 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-1.5 py-0.5 text-[11px] text-center font-bold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500 font-semibold">
                          €/h
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleEmployeeActive(emp.id, emp.activo)
                        }
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {emp.activo ? (
                          <ToggleRight className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-slate-500 text-[11px]">
                  No hay empleados registrados.
                </p>
              )}
            </div>
          </div>

          {/* Resumen Semanal de Pagos */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Coins className="h-4 w-4" /> Pagos Semanales
              </h4>
              <div className="flex items-center bg-slate-200 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-300 dark:border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors"
                >
                  &lt;
                </button>
                <span className="px-2 text-slate-700 dark:text-slate-300 font-semibold">
                  {weekOffset === 0
                    ? "Esta Sem."
                    : weekOffset === -1
                      ? "Sem. Pasada"
                      : `S${weekOffset}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setWeekOffset((o) => Math.min(0, o + 1))
                  }
                  className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors disabled:opacity-30"
                  disabled={weekOffset === 0}
                >
                  &gt;
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Rango:{" "}
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                {weeklyPaymentsData.mondayDate.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })}
              </span>{" "}
              al{" "}
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                {weeklyPaymentsData.sundayDate.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </p>

            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 divide-y divide-slate-200 dark:divide-slate-800/50">
              {weeklyPaymentsData.list.length > 0 ? (
                weeklyPaymentsData.list.map((emp) => (
                  <div
                    key={emp.id}
                    className="pt-2 flex items-center justify-between text-xs font-semibold"
                  >
                    <div>
                      <span className="text-slate-800 dark:text-slate-200 font-bold block">
                        {emp.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {emp.hours.toFixed(1)}h × {emp.rate.toFixed(1)}€
                      </span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-right">
                      {emp.total.toFixed(2)} €
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-slate-500 text-[10px]">
                  Sin horas trabajadas esta semana.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold font-mono">
              <span>Total Liquidación</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {weeklyPaymentsData.grandTotal.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Clock-ins Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-indigo-400" /> Historial de Registro de Jornada (Últimos 50)
            </h4>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-transparent">
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
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isEntrada
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
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4">
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">
            Gestión de Empleados
          </h4>

          {/* Add Employee Compact Card */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <UserPlus className="h-4 w-4 text-indigo-400" />
              <span>Agregar Trabajador</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="newEmpNameMob"
                  className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
                >
                  Nombre
                </label>
                <input
                  id="newEmpNameMob"
                  type="text"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="Ej. Juan P."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="newEmpPinMob"
                  className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
                >
                  PIN (Opcional)
                </label>
                <input
                  id="newEmpPinMob"
                  type="password"
                  value={newEmpPin}
                  onChange={(e) =>
                    setNewEmpPin(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0000"
                  maxLength={4}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold tracking-widest focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddEmployee}
              disabled={!newEmpName.trim()}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
            >
              Crear Ficha
            </button>
          </div>

          {/* Registrar Fichaje Manual (Mobile) */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Fichaje Manual</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="manualEmpMob"
                  className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block"
                >
                  Empleado
                </label>
                <select
                  id="manualEmpMob"
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                >
                  <option value="">Seleccionar...</option>
                  {adminEmployees
                    .filter((e) => e.activo)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Tipo
                  </label>
                  <div className="flex bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setManualTipo("entrada")}
                      className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer text-center ${manualTipo === "entrada"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      Ent.
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualTipo("salida")}
                      className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer text-center ${manualTipo === "salida"
                        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      Sal.
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="manualFechaHoraMob"
                    className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block"
                  >
                    Fecha/Hora
                  </label>
                  <input
                    id="manualFechaHoraMob"
                    type="datetime-local"
                    value={manualFechaHora}
                    onChange={(e) => setManualFechaHora(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddManualFichaje}
                disabled={!manualEmpId || !manualFechaHora}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white"
              >
                Registrar
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 px-1">
              Plantilla ({adminEmployees.length})
            </span>
            <div className="max-h-[140px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60 pr-1">
              {adminEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="py-2 flex items-center justify-between text-xs gap-3"
                >
                  <span
                    className={`font-semibold truncate flex-1 ${emp.activo ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}
                  >
                    {emp.nombre}
                  </span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={emp.coste_hora ?? ""}
                        placeholder={hourlyWage.toString()}
                        onChange={(e) =>
                          handleLocalRateChange(emp.id, e.target.value)
                        }
                        onBlur={(e) =>
                          handleSaveEmployeeRate(
                            emp.id,
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEmployeeRate(
                              emp.id,
                              e.currentTarget.value === ""
                                ? undefined
                                : Number(e.currentTarget.value)
                            );
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-1 py-0.5 text-[10px] text-center font-bold text-slate-900 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[9px] text-slate-500 font-semibold">
                        €/h
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleEmployeeActive(emp.id, emp.activo)
                      }
                      className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {emp.activo ? (
                        <ToggleRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400 dark:text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen Semanal de Pagos Mobile */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Coins className="h-4 w-4" /> Pagos Semanales
            </h4>
            <div className="flex items-center bg-slate-200 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-300 dark:border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors"
              >
                &lt;
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300 font-semibold">
                {weekOffset === 0
                  ? "Esta Sem."
                  : weekOffset === -1
                    ? "Sem. Pasada"
                    : `S${weekOffset}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setWeekOffset((o) => Math.min(0, o + 1))
                }
                className="px-1.5 py-0.5 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-semibold transition-colors disabled:opacity-30"
                disabled={weekOffset === 0}
              >
                &gt;
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Rango:{" "}
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              {weeklyPaymentsData.mondayDate.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>{" "}
            al{" "}
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              {weeklyPaymentsData.sundayDate.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </p>

          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 divide-y divide-slate-200 dark:divide-slate-800/50">
            {weeklyPaymentsData.list.length > 0 ? (
              weeklyPaymentsData.list.map((emp) => (
                <div
                  key={emp.id}
                  className="pt-2 flex items-center justify-between text-xs font-semibold"
                >
                  <div>
                    <span className="text-slate-800 dark:text-slate-200 font-bold block">
                      {emp.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {emp.hours.toFixed(1)}h × {emp.rate.toFixed(1)}€
                    </span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-right">
                    {emp.total.toFixed(2)} €
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-slate-500 text-[10px]">
                Sin horas trabajadas esta semana.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold font-mono">
            <span>Total Liquidación</span>
            <span className="font-bold text-emerald-400 text-sm font-mono">
              {weeklyPaymentsData.grandTotal.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Fichajes timeline Mobile */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">
            Registro de Jornada (Fichajes)
          </h4>
          <div className="space-y-2.5">
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
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isEntrada
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
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
      </div>
    </>
  );
};
