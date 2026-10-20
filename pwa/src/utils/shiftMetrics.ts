import type { FichajeConEmpleado } from "../types";

export interface ShiftAggregate {
  /** Horas trabajadas por día comercial (corte a las 02:00). */
  dailyHours: Record<string, number>;
  /** Coste de personal por día comercial. */
  dailyCost: Record<string, number>;
  /** Horas por empleado y día comercial. */
  employeeDailyHours: Record<string, Record<string, number>>;
}

/**
 * El día comercial no es el día natural: un fichaje de las 01:30 pertenece al
 * servicio que empezó el día anterior. El corte está en las 02:00, igual que en
 * `sync_agent.py`.
 */
export const BUSINESS_DAY_CUTOFF_HOUR = 2;

/**
 * Agrega los fichajes en horas y coste por día comercial.
 *
 * Se cuenta la duración real entre `entrada` y `salida`. No se sustituye por
 * una jornada fija cuando el intervalo es largo: si falta una salida, el dueño
 * lo corrige con un fichaje manual, pero el cálculo no inventa horas.
 *
 * Un `entrada` sin `salida` posterior no suma horas.
 */
export function aggregateShiftHours(
  fichajes: FichajeConEmpleado[],
  hourlyWage: number
): ShiftAggregate {
  const dailyHours: Record<string, number> = {};
  const dailyCost: Record<string, number> = {};
  const employeeDailyHours: Record<string, Record<string, number>> = {};
  const lastEntradaByEmployee: Record<string, number> = {};

  const sorted = [...fichajes].sort(
    (a, b) =>
      new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
  );

  sorted.forEach((fichaje) => {
    const employeeId = fichaje.empleado_id;
    const time = new Date(fichaje.fecha_hora);

    if (fichaje.tipo === "entrada") {
      lastEntradaByEmployee[employeeId] = time.getTime();
      return;
    }

    if (fichaje.tipo !== "salida") return;

    const entradaTime = lastEntradaByEmployee[employeeId];
    if (entradaTime === undefined) return;

    const diffHours = (time.getTime() - entradaTime) / (1000 * 60 * 60);
    const validHours = Math.max(0, diffHours);

    const rate =
      fichaje.empleados?.coste_hora !== undefined &&
      fichaje.empleados?.coste_hora !== null
        ? Number(fichaje.empleados.coste_hora)
        : hourlyWage;

    const day = new Date(entradaTime);
    if (day.getHours() < BUSINESS_DAY_CUTOFF_HOUR) {
      day.setDate(day.getDate() - 1);
    }
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(day.getDate()).padStart(2, "0")}`;

    dailyHours[dateStr] = (dailyHours[dateStr] || 0) + validHours;
    dailyCost[dateStr] = (dailyCost[dateStr] || 0) + validHours * rate;

    if (!employeeDailyHours[dateStr]) {
      employeeDailyHours[dateStr] = {};
    }
    employeeDailyHours[dateStr][employeeId] =
      (employeeDailyHours[dateStr][employeeId] || 0) + validHours;

    delete lastEntradaByEmployee[employeeId];
  });

  return { dailyHours, dailyCost, employeeDailyHours };
}
