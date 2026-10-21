import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  countWeekdayOccurrences,
  eachDate,
  endOfMonthISO,
  endOfWeekISO,
  getMonthRange,
  parseISODate,
  previousRange,
  rangeLength,
  startOfMonthISO,
  startOfWeekISO,
  toISODate,
  weekdayISO,
} from "../src/utils/periods";

describe("periods", () => {
  it("convierte ida y vuelta una fecha sin desplazarla por zona horaria", () => {
    expect(toISODate(parseISODate("2026-10-20"))).toBe("2026-10-20");
  });

  it("suma días cruzando el cambio de mes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("suma meses recortando al último día disponible", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("calcula el día de la semana ISO", () => {
    expect(weekdayISO("2026-10-19")).toBe(1); // lunes
    expect(weekdayISO("2026-10-25")).toBe(7); // domingo
  });

  it("calcula la semana de lunes a domingo", () => {
    expect(startOfWeekISO("2026-10-21")).toBe("2026-10-19");
    expect(endOfWeekISO("2026-10-21")).toBe("2026-10-25");
  });

  it("calcula el mes completo", () => {
    expect(startOfMonthISO("2026-10-20")).toBe("2026-10-01");
    expect(endOfMonthISO("2026-10-20")).toBe("2026-10-31");
    expect(getMonthRange(2026, 1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("cuenta las veces que cae un día de la semana en el rango", () => {
    // Tres lunes y tres domingos entre el 5 y el 25 de octubre de 2026.
    expect(countWeekdayOccurrences("2026-10-05", "2026-10-25", 1)).toBe(3);
    expect(countWeekdayOccurrences("2026-10-05", "2026-10-25", 7)).toBe(3);
    expect(countWeekdayOccurrences("2026-10-05", "2026-10-25", 3)).toBe(3);
  });

  it("calcula el periodo anterior de la misma duración", () => {
    expect(previousRange("2026-10-01", "2026-10-07")).toEqual({
      from: "2026-09-24",
      to: "2026-09-30",
    });
  });

  it("mide duraciones inclusivas", () => {
    expect(rangeLength("2026-10-01", "2026-10-01")).toBe(1);
    expect(rangeLength("2026-10-01", "2026-10-07")).toBe(7);
    expect(eachDate("2026-10-01", "2026-10-03")).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });
});
