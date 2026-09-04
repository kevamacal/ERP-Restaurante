import { useState, useMemo } from "react";
import type { Empleado, VentasResumen, Gasto, SummaryKPI, HistoricoItem } from "../types";

export const getWeekRange = (offset: number) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

export const getWeekDatesList = (monday: Date) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return dates;
};

export function useShiftMetrics(
  fichajesAll: any[],
  adminEmployees: Empleado[],
  resumenData: VentasResumen[],
  gastosList: Gasto[],
  hourlyWage: number,
  foodCostPct: number
) {
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const shiftMetrics = useMemo(() => {
    const dailyHours: Record<string, number> = {};
    const dailyCost: Record<string, number> = {};
    const employeeDailyHours: Record<string, Record<string, number>> = {};
    const employeeLastEntrada: Record<string, number> = {};

    const sorted = [...fichajesAll].sort(
      (a, b) =>
        new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    sorted.forEach((fic) => {
      const empId = fic.empleado_id;
      const time = new Date(fic.fecha_hora);

      if (fic.tipo === "entrada") {
        employeeLastEntrada[empId] = time.getTime();
      } else if (fic.tipo === "salida") {
        const entradaTime = employeeLastEntrada[empId];
        if (entradaTime) {
          const diffHours = (time.getTime() - entradaTime) / (1000 * 60 * 60);
          const validHours = diffHours > 16 ? 8 : Math.max(0, diffHours);

          const rate =
            fic.empleados?.coste_hora !== undefined &&
            fic.empleados?.coste_hora !== null
              ? Number(fic.empleados.coste_hora)
              : hourlyWage;
          const shiftCost = validHours * rate;

          const d = new Date(entradaTime);
          if (d.getHours() < 2) {
            d.setDate(d.getDate() - 1);
          }
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          dailyHours[dateStr] = (dailyHours[dateStr] || 0) + validHours;
          dailyCost[dateStr] = (dailyCost[dateStr] || 0) + shiftCost;

          if (!employeeDailyHours[dateStr]) {
            employeeDailyHours[dateStr] = {};
          }
          employeeDailyHours[dateStr][empId] =
            (employeeDailyHours[dateStr][empId] || 0) + validHours;

          delete employeeLastEntrada[empId];
        }
      }
    });

    return {
      dailyHours,
      dailyCost,
      employeeDailyHours,
    };
  }, [fichajesAll, hourlyWage]);

  const dailyWorkedHours = useMemo(
    () => shiftMetrics.dailyHours,
    [shiftMetrics]
  );

  const weeklyPaymentsData = useMemo(() => {
    const { monday, sunday } = getWeekRange(weekOffset);
    const datesInWeek = getWeekDatesList(monday);

    const employeePayments: Record<
      string,
      { id: string; name: string; hours: number; rate: number; total: number }
    > = {};

    adminEmployees.forEach((emp) => {
      const rate =
        emp.coste_hora !== undefined && emp.coste_hora !== null
          ? Number(emp.coste_hora)
          : hourlyWage;
      employeePayments[emp.id] = {
        id: emp.id,
        name: emp.nombre,
        hours: 0,
        rate: rate,
        total: 0,
      };
    });

    datesInWeek.forEach((dateStr) => {
      const dayHours = shiftMetrics.employeeDailyHours[dateStr];
      if (dayHours) {
        Object.entries(dayHours).forEach(([empId, hours]) => {
          if (employeePayments[empId]) {
            employeePayments[empId].hours += hours;
            employeePayments[empId].total =
              employeePayments[empId].hours * employeePayments[empId].rate;
          } else {
            const relatedFic = fichajesAll.find((f) => f.empleado_id === empId);
            const name = relatedFic?.empleados?.nombre || "Desconocido";
            const rate =
              relatedFic?.empleados?.coste_hora !== undefined &&
              relatedFic?.empleados?.coste_hora !== null
                ? Number(relatedFic.empleados.coste_hora)
                : hourlyWage;
            employeePayments[empId] = {
              id: empId,
              name,
              hours: hours,
              rate,
              total: hours * rate,
            };
          }
        });
      }
    });

    return {
      mondayDate: monday,
      sundayDate: sunday,
      list: Object.values(employeePayments).sort((a, b) => b.total - a.total),
      grandTotal: Object.values(employeePayments).reduce(
        (acc, emp) => acc + emp.total,
        0
      ),
    };
  }, [weekOffset, adminEmployees, shiftMetrics, hourlyWage, fichajesAll]);

  const kpis: SummaryKPI = useMemo(() => {
    if (!resumenData || resumenData.length === 0) {
      return {
        totalFacturado: 0,
        numTickets: 0,
        totalEfectivo: 0,
        totalTarjeta: 0,
        totalPendiente: 0,
        ticketMedio: 0,
        ultimaActualizacion: new Date().toISOString(),
        comparativaPct: 0,
        costePersonal: 0,
        laborCostPct: 0,
        productividad: 0,
        horasTrabajadas: 0,
      };
    }

    const latestDate = resumenData[0].fecha;
    const dayRecords = resumenData.filter((r) => r.fecha === latestDate);

    const totalFacturado = dayRecords.reduce(
      (acc, r) => acc + (Number(r.total_facturado) || 0),
      0
    );
    const numTickets = dayRecords.reduce(
      (acc, r) => acc + (Number(r.num_tickets) || 0),
      0
    );
    const totalEfectivo = dayRecords.reduce(
      (acc, r) => acc + (Number(r.total_efectivo) || 0),
      0
    );
    const totalTarjeta = dayRecords.reduce(
      (acc, r) => acc + (Number(r.total_tarjeta) || 0),
      0
    );
    const totalPendiente = dayRecords.reduce(
      (acc, r) => acc + (Number(r.total_pendiente) || 0),
      0
    );
    const ticketMedio = numTickets > 0 ? totalFacturado / numTickets : 0;
    const lastUpdate =
      dayRecords[0].ultima_actualizacion || new Date().toISOString();

    const horasTrabajadas = dailyWorkedHours[latestDate] || 0;
    const costePersonal = shiftMetrics.dailyCost[latestDate] || 0;
    const laborCostPct =
      totalFacturado > 0 ? (costePersonal / totalFacturado) * 100 : 0;
    const productividad =
      horasTrabajadas > 0 ? totalFacturado / horasTrabajadas : 0;

    return {
      totalFacturado,
      numTickets,
      totalEfectivo,
      totalTarjeta,
      totalPendiente,
      ticketMedio,
      ultimaActualizacion: lastUpdate,
      comparativaPct: 12.4,
      costePersonal,
      laborCostPct,
      productividad,
      horasTrabajadas,
    };
  }, [resumenData, dailyWorkedHours, shiftMetrics]);

  const historico = useMemo(() => {
    const getWeekIdentifier = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      const utcDay = d.getUTCDay();
      const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
      const monday = new Date(d.getTime() + diffToMonday * 86400000);

      const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
      const daysDiff = Math.round(
        (monday.getTime() - yearStart.getTime()) / 86400000
      );
      const startDay = yearStart.getUTCDay();
      const weekNum =
        Math.floor((daysDiff + (startDay === 0 ? -6 : 1 - startDay) + 6) / 7) +
        1;

      const mDate = monday.getUTCDate();
      const mMonth = monday.getUTCMonth() + 1;
      const sDate = new Date(monday.getTime() + 6 * 86400000).getUTCDate();
      const sMonth =
        new Date(monday.getTime() + 6 * 86400000).getUTCMonth() + 1;

      const rangeLabel = `${String(mDate).padStart(2, "0")}/${String(mMonth).padStart(2, "0")} al ${String(sDate).padStart(2, "0")}/${String(sMonth).padStart(2, "0")}`;

      return {
        key: `${monday.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`,
        label: `W${weekNum} (${rangeLabel})`,
      };
    };

    const semanalMap: Record<
      string,
      { tickets: number; ventas: number; horas: number; label: string }
    > = {};
    const mensualMap: Record<
      string,
      { tickets: number; ventas: number; horas: number }
    > = {};
    const anualMap: Record<
      string,
      { tickets: number; ventas: number; horas: number }
    > = {};

    resumenData.forEach((row) => {
      const d = new Date(row.fecha);
      if (Number.isNaN(d.getTime())) return;

      const dateStr = row.fecha;
      const horas = dailyWorkedHours[dateStr] || 0;

      const ano = d.getFullYear().toString();
      const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const { key: semana, label: weekLabel } = getWeekIdentifier(dateStr);

      const v = Number(row.total_facturado) || 0;
      const t = Number(row.num_tickets) || 0;

      if (!anualMap[ano]) anualMap[ano] = { tickets: 0, ventas: 0, horas: 0 };
      anualMap[ano].tickets += t;
      anualMap[ano].ventas += v;
      anualMap[ano].horas += horas;

      if (!mensualMap[mes])
        mensualMap[mes] = { tickets: 0, ventas: 0, horas: 0 };
      mensualMap[mes].tickets += t;
      mensualMap[mes].ventas += v;
      mensualMap[mes].horas += horas;

      if (!semanalMap[semana])
        semanalMap[semana] = {
          tickets: 0,
          ventas: 0,
          horas: 0,
          label: weekLabel,
        };
      semanalMap[semana].tickets += t;
      semanalMap[semana].ventas += v;
      semanalMap[semana].horas += horas;
    });

    const formatItems = (
      map: Record<
        string,
        { tickets: number; ventas: number; horas: number; label?: string }
      >,
      prefix = "",
      limit = 12
    ): HistoricoItem[] => {
      return Object.keys(map)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, limit)
        .map((key) => {
          const v = map[key].ventas;

          let realGastosPeriodo = 0;
          let realIngresosExtraPeriodo = 0;
          gastosList.forEach((g) => {
            const { key: semanaG } = getWeekIdentifier(g.fecha);
            const gd = new Date(g.fecha);
            if (Number.isNaN(gd.getTime())) return;
            const anoG = gd.getFullYear().toString();
            const mesG = `${anoG}-${String(gd.getMonth() + 1).padStart(2, "0")}`;

            const matches =
              (prefix === "Año " && key === anoG) ||
              (prefix === "" && key === mesG) ||
              (prefix === "Semana " && key === semanaG);

            if (matches) {
              if (g.tipo === "ingreso" || g.categoria === "Ingreso / Bonificación") {
                realIngresosExtraPeriodo += g.importe;
              } else {
                realGastosPeriodo += g.importe;
              }
            }
          });

          const costeMateriaPrima =
            realGastosPeriodo > 0 ? realGastosPeriodo : v * (foodCostPct / 100);

          let costePersonal = 0;
          Object.keys(shiftMetrics.dailyCost).forEach((dateStr) => {
            const { key: semana } = getWeekIdentifier(dateStr);
            const d = new Date(dateStr);
            const ano = d.getFullYear().toString();
            const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, "0")}`;

            if (prefix === "Año " && key === ano) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            } else if (prefix === "" && key === mes) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            } else if (prefix === "Semana " && key === semana) {
              costePersonal += shiftMetrics.dailyCost[dateStr];
            }
          });

          const g = costeMateriaPrima + costePersonal;
          const beneficio = v + realIngresosExtraPeriodo - g;

          return {
            periodo:
              prefix === "Semana "
                ? `Semana ${map[key].label}`
                : `${prefix}${key}`,
            tickets: map[key].tickets,
            ventas: Math.round(v * 100) / 100,
            gastos: Math.round(g * 100) / 100,
            ingresosExtra: Math.round(realIngresosExtraPeriodo * 100) / 100,
            beneficio: Math.round(beneficio * 100) / 100,
          };
        });
    };

    return {
      anual: formatItems(anualMap, "Año ", 5),
      mensual: formatItems(mensualMap, "", 12),
      semanal: formatItems(semanalMap, "Semana ", 8),
    };
  }, [resumenData, dailyWorkedHours, gastosList, foodCostPct, shiftMetrics]);

  return {
    weekOffset,
    setWeekOffset,
    shiftMetrics,
    dailyWorkedHours,
    weeklyPaymentsData,
    kpis,
    historico,
  };
}
