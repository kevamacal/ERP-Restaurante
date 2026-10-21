import { describe, expect, it } from "vitest";
import type {
  AnalyticsCoverage,
  AnalyticsDailyRow,
  AnalyticsHourlyRow,
  AnalyticsPeriodTotals,
  AnalyticsWeekdayRow,
} from "../src/types";
import {
  buildCalendarWeeks,
  buildComparisonMetrics,
  buildDailyTableRows,
  buildHeatmap,
  buildHourlySummary,
  buildTimeseriesPoints,
  buildWeekdayAverages,
  getAutoGranularity,
  getCoverageRatio,
  movingAverage,
  pctChange,
  resolveRangePreset,
  safeDivide,
  yearOptions,
} from "../src/utils/analytics";

const coverage: AnalyticsCoverage = {
  primera_venta: "2026-01-01",
  ultima_venta: "2026-10-20",
  primera_hora: "2026-06-01",
  ultima_hora: "2026-10-20",
  dias_diarios: 200,
  dias_horarios: 100,
};

function hourlyRow(
  dia_semana: number,
  hora: number,
  facturado: number,
  tickets: number,
  dias_con_datos: number
): AnalyticsHourlyRow {
  return { dia_semana, hora, facturado, tickets, dias_con_datos };
}

function dailyRow(fecha: string, facturado: number, tickets: number): AnalyticsDailyRow {
  return {
    fecha,
    facturado,
    tickets,
    efectivo: facturado * 0.6,
    tarjeta: facturado * 0.4,
    pendiente: 0,
    ultima_actualizacion: null,
    total_count: 1,
  };
}

describe("resolveRangePreset", () => {
  it("resuelve los últimos 30 días anclados a la última venta", () => {
    expect(resolveRangePreset("30d", coverage, "", "")).toEqual({
      from: "2026-09-21",
      to: "2026-10-20",
    });
  });

  it("resuelve todo el histórico desde la primera venta", () => {
    expect(resolveRangePreset("all", coverage, "", "")).toEqual({
      from: "2026-01-01",
      to: "2026-10-20",
    });
  });

  it("resuelve el mes anterior completo", () => {
    expect(resolveRangePreset("prev-month", coverage, "", "")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("devuelve null si faltan datos para un rango personalizado", () => {
    expect(resolveRangePreset("custom", coverage, "", "")).toBeNull();
    expect(resolveRangePreset("custom", coverage, "2026-10-01", "")).toBeNull();
  });

  it("ordena un rango personalizado invertido", () => {
    expect(resolveRangePreset("custom", coverage, "2026-10-10", "2026-10-01")).toEqual({
      from: "2026-10-01",
      to: "2026-10-10",
    });
  });
});

describe("getAutoGranularity", () => {
  it("usa día, semana o mes según la longitud", () => {
    expect(getAutoGranularity("2026-10-01", "2026-10-30")).toBe("day");
    expect(getAutoGranularity("2026-01-01", "2026-10-20")).toBe("week");
    expect(getAutoGranularity("2020-01-01", "2026-10-20")).toBe("month");
  });
});

describe("helpers numéricos", () => {
  it("calcula medias móviles alineadas", () => {
    expect(movingAverage([10, 20, 30, 40], 2)).toEqual([10, 15, 25, 35]);
  });

  it("no divide entre cero", () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it("devuelve null cuando no hay base de comparación", () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(15, 10)).toBeCloseTo(0.5);
  });
});

describe("buildTimeseriesPoints", () => {
  it("etiqueta los buckets y añade media móvil", () => {
    const points = buildTimeseriesPoints(
      [
        {
          bucket_start: "2026-10-01",
          facturado: 100,
          tickets: 10,
          efectivo: 60,
          tarjeta: 40,
          pendiente: 0,
          dias_con_datos: 1,
        },
        {
          bucket_start: "2026-10-02",
          facturado: 200,
          tickets: 20,
          efectivo: 120,
          tarjeta: 80,
          pendiente: 0,
          dias_con_datos: 1,
        },
      ],
      "day"
    );

    expect(points).toHaveLength(2);
    expect(points[1].facturado).toBe(200);
    expect(points[1].ticketMedio).toBe(10);
    expect(points[1].movingAverage).toBe(150);
  });
});

describe("buildHourlySummary", () => {
  it("detecta la hora punta, el top 3 y las franjas", () => {
    const summary = buildHourlySummary([
      hourlyRow(1, 13, 100, 10, 5),
      hourlyRow(1, 20, 200, 10, 5),
      hourlyRow(1, 21, 50, 5, 5),
    ]);

    expect(summary.totalFacturado).toBe(350);
    expect(summary.peakHour).toBe(20);
    expect(summary.top3Share).toBeCloseTo(1);
    const comida = summary.bands.find((band) => band.id === "comida");
    const cena = summary.bands.find((band) => band.id === "cena");
    expect(comida?.facturado).toBe(100);
    expect(cena?.facturado).toBe(250);
  });

  it("no marca hora punta si no hay facturación", () => {
    const summary = buildHourlySummary([]);
    expect(summary.peakHour).toBeNull();
    expect(summary.top3Share).toBe(0);
  });
});

describe("buildHeatmap", () => {
  it("divide por las veces que cae el día en el rango", () => {
    const heatmap = buildHeatmap([hourlyRow(1, 13, 300, 30, 3)], "2026-10-05", "2026-10-25");
    const monday = heatmap.cells.find((cell) => cell.dia === 1 && cell.hora === 13);
    expect(monday?.ocurrencias).toBe(3);
    expect(monday?.media).toBe(100);
    expect(heatmap.maxMedia).toBe(100);
  });
});

describe("buildWeekdayAverages", () => {
  it("rellena los siete días aunque falten filas", () => {
    const rows: AnalyticsWeekdayRow[] = [
      { dia_semana: 1, facturado: 300, tickets: 30, dias_con_datos: 3 },
    ];
    const averages = buildWeekdayAverages(rows);
    expect(averages).toHaveLength(7);
    expect(averages[0].media).toBe(100);
    expect(averages[6].media).toBe(0);
  });
});

describe("buildComparisonMetrics", () => {
  it("calcula deltas absolutos y relativos", () => {
    const a: AnalyticsPeriodTotals = {
      facturado: 200,
      tickets: 10,
      efectivo: 120,
      tarjeta: 80,
      pendiente: 0,
      dias_con_datos: 5,
      dias_horarios: 5,
      primera_fecha: "2026-10-14",
      ultima_fecha: "2026-10-20",
      mejor_fecha: "2026-10-18",
      mejor_facturado: 60,
      peor_fecha: "2026-10-15",
      peor_facturado: 20,
    };
    const b: AnalyticsPeriodTotals = {
      ...a,
      facturado: 100,
      efectivo: 60,
      tarjeta: 40,
    };

    const metrics = buildComparisonMetrics(a, b);
    const facturado = metrics.find((metric) => metric.key === "facturado");
    expect(facturado?.delta).toBe(100);
    expect(facturado?.deltaPct).toBeCloseTo(1);
    const ticketMedio = metrics.find((metric) => metric.key === "ticketMedio");
    expect(ticketMedio?.a).toBe(20);
    expect(ticketMedio?.b).toBe(10);
  });
});

describe("buildDailyTableRows", () => {
  it("compara cada día con la media de su día de la semana", () => {
    const rows = [dailyRow("2026-10-20", 150, 10)]; // martes
    const weekday: AnalyticsWeekdayRow[] = [
      { dia_semana: 2, facturado: 400, tickets: 40, dias_con_datos: 4 },
    ];
    const table = buildDailyTableRows(rows, weekday);
    expect(table[0].mediaDiaSemana).toBe(100);
    expect(table[0].variacionMedia).toBeCloseTo(0.5);
    expect(table[0].efectivoShare).toBeCloseTo(0.6);
  });
});

describe("calendario y cobertura", () => {
  it("construye semanas completas de lunes a domingo", () => {
    const calendar = buildCalendarWeeks(2026, [dailyRow("2026-01-01", 100, 10)]);
    expect(calendar.weeks.length).toBeGreaterThanOrEqual(53);
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true);
    expect(calendar.max).toBe(100);
  });

  it("calcula la cobertura horaria y los años disponibles", () => {
    expect(getCoverageRatio(coverage)).toBeCloseTo(0.5);
    expect(yearOptions(coverage)).toEqual([2026]);
    expect(yearOptions(null)).toEqual([]);
  });
});
