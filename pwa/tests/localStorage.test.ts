import { beforeEach, describe, expect, it, vi } from "vitest";
import { readJsonArray, writeJson } from "../src/utils/localStorage";
import { isGasto } from "../src/utils/typeGuards";
import {
  readCostSettings,
  saveCostSettings,
} from "../src/utils/costSettings";

function createStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("readJsonArray", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("devuelve un array vacío si el JSON está corrupto, sin lanzar", () => {
    vi.stubGlobal(
      "localStorage",
      createStorage({ roto: "{esto no es json" })
    );

    expect(() => readJsonArray("roto")).not.toThrow();
    expect(readJsonArray("roto")).toEqual([]);
  });

  it("devuelve un array vacío si el valor no es un array", () => {
    vi.stubGlobal(
      "localStorage",
      createStorage({ objeto: '{"a":1}' })
    );

    expect(readJsonArray("objeto")).toEqual([]);
  });

  it("devuelve el array guardado", () => {
    vi.stubGlobal(
      "localStorage",
      createStorage({ lista: '[{"id":"1"}]' })
    );

    expect(readJsonArray("lista")).toEqual([{ id: "1" }]);
  });

  it("escribe JSON serializado sin lanzar", () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);

    writeJson("lista", [{ id: "1" }]);

    expect(storage.getItem("lista")).toBe('[{"id":"1"}]');
  });
});

describe("cost settings", () => {
  it("usa los valores por defecto si no hay nada guardado", () => {
    vi.stubGlobal("localStorage", createStorage());

    expect(readCostSettings()).toEqual({ foodCostPct: 30, hourlyWage: 10 });
  });

  it("lee los valores guardados", () => {
    vi.stubGlobal(
      "localStorage",
      createStorage({ app_food_cost_pct: "35", app_hourly_wage: "12.5" })
    );

    expect(readCostSettings()).toEqual({ foodCostPct: 35, hourlyWage: 12.5 });
  });

  it("ignora valores inválidos y acota los que se pasan del máximo", () => {
    vi.stubGlobal(
      "localStorage",
      createStorage({ app_food_cost_pct: "-5", app_hourly_wage: "99999" })
    );

    expect(readCostSettings()).toEqual({ foodCostPct: 30, hourlyWage: 1000 });
  });

  it("guarda ambos valores", () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);

    saveCostSettings({ foodCostPct: 35, hourlyWage: 12.5 });

    expect(storage.getItem("app_food_cost_pct")).toBe("35");
    expect(storage.getItem("app_hourly_wage")).toBe("12.5");
  });
});

describe("isGasto", () => {
  const valido = {
    id: "g1",
    local_id: "local_1",
    fecha: "2026-10-20",
    concepto: "Factura",
    categoria: "Materia Prima",
    importe: 12.5,
    tipo: "gasto",
  };

  it("acepta un gasto con la forma esperada", () => {
    expect(isGasto(valido)).toBe(true);
  });

  it("rechaza un registro sin importe numérico", () => {
    expect(isGasto({ ...valido, importe: "12,50" })).toBe(false);
  });

  it("rechaza un registro con categoría desconocida", () => {
    expect(isGasto({ ...valido, categoria: "Otra" })).toBe(false);
  });
});
