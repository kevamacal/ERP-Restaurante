export const FOOD_COST_KEY = "app_food_cost_pct";
export const HOURLY_WAGE_KEY = "app_hourly_wage";

export const DEFAULT_FOOD_COST_PCT = 30;
export const DEFAULT_HOURLY_WAGE = 10;

export const MAX_FOOD_COST_PCT = 100;
export const MAX_HOURLY_WAGE = 1000;

export interface CostSettings {
  foodCostPct: number;
  hourlyWage: number;
}

function readNumber(key: string, fallback: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw.trim() === "") return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;

    return Math.min(parsed, max);
  } catch {
    return fallback;
  }
}

/**
 * Parámetros de coste operativo. Viven en `localStorage`, así que son por
 * dispositivo y no por empresa: persistirlos en BD queda pendiente.
 */
export function readCostSettings(): CostSettings {
  return {
    foodCostPct: readNumber(
      FOOD_COST_KEY,
      DEFAULT_FOOD_COST_PCT,
      MAX_FOOD_COST_PCT
    ),
    hourlyWage: readNumber(
      HOURLY_WAGE_KEY,
      DEFAULT_HOURLY_WAGE,
      MAX_HOURLY_WAGE
    ),
  };
}

/** Lanza si el navegador no permite escribir (`QuotaExceeded`, modo privado). */
export function saveCostSettings(settings: CostSettings): void {
  localStorage.setItem(FOOD_COST_KEY, String(settings.foodCostPct));
  localStorage.setItem(HOURLY_WAGE_KEY, String(settings.hourlyWage));
}
