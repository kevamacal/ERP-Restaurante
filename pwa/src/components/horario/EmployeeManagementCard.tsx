import React from "react";
import type { Empleado } from "../../types";
import { UserPlus, Users, ToggleLeft, ToggleRight } from "lucide-react";

interface EmployeeManagementCardProps {
  adminEmployees: Empleado[];
  newEmpName: string;
  setNewEmpName: (val: string) => void;
  newEmpPin: string;
  setNewEmpPin: (val: string) => void;
  handleAddEmployee: () => void;
  handleToggleEmployeeActive: (id: string, active: boolean) => void;
  handleLocalRateChange: (id: string, val: string) => void;
  handleSaveEmployeeRate: (id: string, val: number | undefined) => void;
  hourlyWage: number;
}

export const EmployeeManagementCard: React.FC<EmployeeManagementCardProps> = ({
  adminEmployees,
  newEmpName,
  setNewEmpName,
  newEmpPin,
  setNewEmpPin,
  handleAddEmployee,
  handleToggleEmployeeActive,
  handleLocalRateChange,
  handleSaveEmployeeRate,
  hourlyWage,
}) => {
  return (
    <div className="space-y-4">
      {/* Agregar Trabajador Form Card */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" /> Agregar Trabajador
        </h4>
        <div className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="newEmpNameInput"
              className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
            >
              Nombre Completo
            </label>
            <input
              id="newEmpNameInput"
              type="text"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="newEmpPinInput"
              className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
            >
              PIN Fichaje (Opcional)
            </label>
            <input
              id="newEmpPinInput"
              type="password"
              value={newEmpPin}
              onChange={(e) => setNewEmpPin(e.target.value.replace(/\D/g, ""))}
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

      {/* Plantilla de Empleados Roster */}
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
                  className={`font-semibold truncate flex-1 ${
                    emp.activo
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 line-through"
                  }`}
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
    </div>
  );
};
