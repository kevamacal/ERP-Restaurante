import { describe, expect, it } from "vitest";
import { aggregateShiftHours } from "../src/utils/shiftMetrics";
import type { FichajeConEmpleado } from "../src/types";

const HOURLY_WAGE = 10;

let sequence = 0;

function fichaje(
  empleadoId: string,
  tipo: "entrada" | "salida",
  fechaHora: string,
  costeHora?: number | null
): FichajeConEmpleado {
  sequence += 1;

  return {
    id: `fic_${sequence}`,
    empleado_id: empleadoId,
    tipo,
    fecha_hora: fechaHora,
    empleados: {
      nombre: `Empleado ${empleadoId}`,
      coste_hora: costeHora,
    },
  };
}

describe("aggregateShiftHours", () => {
  it("cuenta la duración real de un turno normal", () => {
    const result = aggregateShiftHours(
      [
        fichaje("e1", "entrada", "2026-10-20T09:00:00"),
        fichaje("e1", "salida", "2026-10-20T17:00:00"),
      ],
      HOURLY_WAGE
    );

    expect(result.dailyHours["2026-10-20"]).toBe(8);
    expect(result.dailyCost["2026-10-20"]).toBe(80);
  });

  it("no sustituye por 8 h cuando el intervalo supera 16 h", () => {
    const result = aggregateShiftHours(
      [
        fichaje("e1", "entrada", "2026-10-20T08:00:00"),
        fichaje("e1", "salida", "2026-10-21T02:00:00"),
      ],
      HOURLY_WAGE
    );

    // 18 h reales, no las 8 h que asignaba el tope anterior.
    expect(result.dailyHours["2026-10-20"]).toBe(18);
    expect(result.dailyCost["2026-10-20"]).toBe(180);
  });

  it("ignora una entrada sin salida", () => {
    const result = aggregateShiftHours(
      [fichaje("e1", "entrada", "2026-10-20T09:00:00")],
      HOURLY_WAGE
    );

    expect(result.dailyHours).toEqual({});
    expect(result.dailyCost).toEqual({});
  });

  it("suma varios turnos del mismo empleado en el mismo día", () => {
    const result = aggregateShiftHours(
      [
        fichaje("e1", "entrada", "2026-10-20T09:00:00"),
        fichaje("e1", "salida", "2026-10-20T13:00:00"),
        fichaje("e1", "entrada", "2026-10-20T17:00:00"),
        fichaje("e1", "salida", "2026-10-20T21:00:00"),
      ],
      HOURLY_WAGE
    );

    expect(result.dailyHours["2026-10-20"]).toBe(8);
    expect(result.employeeDailyHours["2026-10-20"]["e1"]).toBe(8);
  });

  it("imputa al día comercial anterior una entrada antes de las 02:00", () => {
    const result = aggregateShiftHours(
      [
        fichaje("e1", "entrada", "2026-10-21T01:30:00"),
        fichaje("e1", "salida", "2026-10-21T03:30:00"),
      ],
      HOURLY_WAGE
    );

    expect(result.dailyHours["2026-10-20"]).toBe(2);
    expect(result.dailyHours["2026-10-21"]).toBeUndefined();
  });

  it("usa el coste por hora del empleado y cae al global si es nulo", () => {
    const result = aggregateShiftHours(
      [
        fichaje("e1", "entrada", "2026-10-20T09:00:00", 15),
        fichaje("e1", "salida", "2026-10-20T10:00:00", 15),
        fichaje("e2", "entrada", "2026-10-20T09:00:00", null),
        fichaje("e2", "salida", "2026-10-20T10:00:00", null),
      ],
      HOURLY_WAGE
    );

    expect(result.dailyCost["2026-10-20"]).toBe(25);
  });
});
