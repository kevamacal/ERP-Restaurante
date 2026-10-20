import type { CategoriaGasto, Gasto } from "../types";

const CATEGORIAS_GASTO: readonly CategoriaGasto[] = [
  "Materia Prima",
  "Alquiler",
  "Suministros",
  "Gastos de Personal",
  "Ingreso / Bonificación",
  "Otros",
];

/**
 * Un array válido en `localStorage` no garantiza que cada elemento tenga la
 * forma de `Gasto`. Sin este guard, un registro antiguo sin `importe` numérico
 * rompe al renderizar (`gasto.importe.toFixed(2)`).
 */
export function isGasto(value: unknown): value is Gasto {
  if (typeof value !== "object" || value === null) return false;

  const gasto = value as Record<string, unknown>;

  return (
    typeof gasto.id === "string" &&
    typeof gasto.concepto === "string" &&
    typeof gasto.fecha === "string" &&
    typeof gasto.importe === "number" &&
    Number.isFinite(gasto.importe) &&
    typeof gasto.categoria === "string" &&
    CATEGORIAS_GASTO.includes(gasto.categoria as CategoriaGasto) &&
    (gasto.tipo === undefined ||
      gasto.tipo === "gasto" ||
      gasto.tipo === "ingreso")
  );
}
