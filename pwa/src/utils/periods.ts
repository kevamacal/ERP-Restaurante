/**
 * Fechas de calendario para estadísticas.
 *
 * Se trabaja siempre con cadenas `YYYY-MM-DD` y fechas locales a mediodía para
 * que un cambio de horario (DST) no desplace el día. El día comercial ya viene
 * resuelto desde la base de datos; aquí no se reinterpreta la hora del ticket.
 */

export interface DateRange {
  from: string;
  to: string;
}

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const WEEKDAY_LONG = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/** Orden de horas de un servicio de restaurante: empieza a las 06:00 y cierra a las 02:00. */
export const HOUR_ORDER = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];

/** Para el mapa de calor se incluyen también las horas sin servicio. */
export const HEATMAP_HOUR_ORDER = [...HOUR_ORDER, 2, 3, 4, 5];

export function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}

export function differenceInDays(from: string, to: string): number {
  return Math.round(
    (parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000
  );
}

export function rangeLength(from: string, to: string): number {
  return Math.max(0, differenceInDays(from, to) + 1);
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const total = differenceInDays(from, to);
  for (let index = 0; index <= total; index += 1) {
    dates.push(addDays(from, index));
  }
  return dates;
}

/** 1 = lunes … 7 = domingo. */
export function weekdayISO(iso: string): number {
  const day = parseISODate(iso).getDay();
  return day === 0 ? 7 : day;
}

export function startOfWeekISO(iso: string): string {
  return addDays(iso, -(weekdayISO(iso) - 1));
}

export function endOfWeekISO(iso: string): string {
  return addDays(startOfWeekISO(iso), 6);
}

export function startOfMonthISO(iso: string): string {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1, 12));
}

export function endOfMonthISO(iso: string): string {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

export function getWeekRange(iso: string): DateRange {
  return { from: startOfWeekISO(iso), to: endOfWeekISO(iso) };
}

export function getMonthRange(year: number, monthIndex: number): DateRange {
  const from = toISODate(new Date(year, monthIndex, 1, 12));
  const to = toISODate(new Date(year, monthIndex + 1, 0, 12));
  return { from, to };
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function parseMonthKey(key: string): { year: number; monthIndex: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function countWeekdayOccurrences(
  from: string,
  to: string,
  weekday: number
): number {
  if (from > to) return 0;
  let count = 0;
  const total = differenceInDays(from, to);
  for (let index = 0; index <= total; index += 1) {
    if (weekdayISO(addDays(from, index)) === weekday) count += 1;
  }
  return count;
}

/** Periodo inmediatamente anterior, de la misma duración. */
export function previousRange(from: string, to: string): DateRange {
  const length = rangeLength(from, to);
  const previousTo = addDays(from, -1);
  return { from: addDays(previousTo, -(length - 1)), to: previousTo };
}

export function clampEnd(_start: string, end: string, maxEnd: string): string {
  return end > maxEnd ? maxEnd : end;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? "—";
}

export function weekdayLongLabel(weekday: number): string {
  return WEEKDAY_LONG[weekday - 1] ?? "—";
}
