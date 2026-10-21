/**
 * Formateo de números, dinero y fechas para las estadísticas.
 *
 * Siempre `es-ES` explícito: el proyecto se ve en móviles con otros idiomas y
 * las fechas no deben cambiar de orden según el dispositivo.
 */

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyCompactFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function asDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return currencyFormatter.format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return currencyCompactFormatter.format(value);
}

export function formatSignedCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${currencyFormatter.format(value)}`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return decimalFormatter.format(value);
}

export function formatPercentFromRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return percentFormatter.format(ratio);
}

export function formatSignedPercentFromRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "n/d";
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${percentFormatter.format(ratio)}`;
}

export function formatDateEs(value: string | Date): string {
  const date = asDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateShortEs(value: string | Date): string {
  const date = asDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatDateLongEs(value: string | Date): string {
  const date = asDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatWeekdayEs(value: string | Date): string {
  const date = asDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date);
}

export function formatMonthEs(year: number, monthIndex: number): string {
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1, 12));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
