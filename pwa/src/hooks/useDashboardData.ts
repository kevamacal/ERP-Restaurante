import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabase } from "../supabaseClient";
import type { Local, VentasResumen, VentaHora, Gasto } from "../types";

export function useDashboardData(isAdminAuthenticated: boolean, empresaId?: string) {
  const [selectedLocal, setSelectedLocal] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [localesLoaded, setLocalesLoaded] = useState<boolean>(false);
  const [localesList, setLocalesList] = useState<Local[]>([]);
  const [resumenData, setResumenData] = useState<VentasResumen[]>([]);
  const [ventasHoraData, setVentasHoraData] = useState<VentaHora[]>([]);
  const [gastosData, setGastosData] = useState<Gasto[]>([]);

  const fetchLocales = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let activeEmpresaId = empresaId;
      if (!activeEmpresaId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          const { data: empData } = await supabase
            .from("empresas")
            .select("id")
            .eq("owner_user_id", userId)
            .maybeSingle();
          if (empData?.id) activeEmpresaId = empData.id;
        }
      }

      let query = supabase
        .from("locales")
        .select("id, nombre, ip_publica, empresa_id")
        .order("id");

      if (activeEmpresaId) {
        query = query.eq("empresa_id", activeEmpresaId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLocalesList([
          { id: "all", nombre: "Todos los Locales" },
          ...data,
        ]);
      } else if (!error && data && data.length === 0) {
        setLocalesList([]);
      }
    } catch (e) {
      console.error("Error cargando locales de Supabase:", e);
    } finally {
      setLocalesLoaded(true);
    }
  }, [empresaId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      let activeEmpresaId = empresaId;
      if (!activeEmpresaId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          const { data: empData } = await supabase
            .from("empresas")
            .select("id")
            .eq("owner_user_id", userId)
            .maybeSingle();
          if (empData?.id) activeEmpresaId = empData.id;
        }
      }

      let queryRes = supabase
        .from("ventas_resumen_diario")
        .select("*")
        .order("fecha", { ascending: false });

      if (activeEmpresaId) {
        queryRes = queryRes.eq("empresa_id", activeEmpresaId);
      }

      if (selectedLocal !== "all") {
        queryRes = queryRes.eq("local_id", selectedLocal);
      }

      const { data: rData, error: rErr } = await queryRes;

      if (!rErr && rData) {
        setResumenData(rData);

        if (rData.length > 0) {
          const latestDate = rData[0].fecha;
          let queryHora = supabase
            .from("ventas_por_hora")
            .select("*")
            .eq("fecha", latestDate)
            .order("hora", { ascending: true });

          if (activeEmpresaId) {
            queryHora = queryHora.eq("empresa_id", activeEmpresaId);
          }

          if (selectedLocal !== "all") {
            queryHora = queryHora.eq("local_id", selectedLocal);
          }

          const { data: hData, error: hErr } = await queryHora;
          if (!hErr && hData) {
            setVentasHoraData(hData);
          } else {
            setVentasHoraData([]);
          }
        } else {
          setVentasHoraData([]);
        }
      }

      // --- Gastos ---
      let queryGastos = supabase
        .from("gastos")
        .select("id, local_id, empresa_id, fecha, concepto, categoria, importe, tipo")
        .order("fecha", { ascending: false });

      if (activeEmpresaId) {
        queryGastos = queryGastos.eq("empresa_id", activeEmpresaId);
      }

      if (selectedLocal !== "all") {
        queryGastos = queryGastos.eq("local_id", selectedLocal);
      }

      const { data: gData, error: gErr } = await queryGastos;
      if (!gErr && gData) {
        setGastosData(gData as Gasto[]);
      } else {
        setGastosData([]);
      }
    } catch (e) {
      console.error("Error cargando datos de Supabase:", e);
    }
    setLoading(false);
  }, [selectedLocal, empresaId]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAdminAuthenticated]);

  const dailyResumenData = useMemo(() => {
    // Agregar gastos reales por fecha (solo tipo 'gasto', no ingresos/bonificaciones)
    const gastosPorFecha = new Map<string, number>();
    gastosData.forEach((g) => {
      if (!g.tipo || g.tipo === "gasto") {
        const prev = gastosPorFecha.get(g.fecha) ?? 0;
        gastosPorFecha.set(g.fecha, prev + (Number(g.importe) || 0));
      }
    });

    const grouped = new Map<string, VentasResumen>();

    resumenData.forEach((row) => {
      const dateKey = row.fecha;
      const existing = grouped.get(dateKey);
      const totalFacturado = Number(row.total_facturado) || 0;
      const numTickets = Number(row.num_tickets) || 0;
      const totalEfectivo = Number(row.total_efectivo) || 0;
      const totalTarjeta = Number(row.total_tarjeta) || 0;
      const ultimaActualizacion =
        row.ultima_actualizacion || new Date().toISOString();

      if (!existing) {
        grouped.set(dateKey, {
          local_id: selectedLocal === "all" ? "all" : row.local_id,
          fecha: dateKey,
          total_facturado: totalFacturado,
          num_tickets: numTickets,
          total_efectivo: totalEfectivo,
          total_tarjeta: totalTarjeta,
          ultima_actualizacion: ultimaActualizacion,
          total_gasto: gastosPorFecha.get(dateKey) ?? 0,
        });
      } else {
        grouped.set(dateKey, {
          ...existing,
          total_facturado: existing.total_facturado + totalFacturado,
          num_tickets: existing.num_tickets + numTickets,
          total_efectivo: existing.total_efectivo + totalEfectivo,
          total_tarjeta: existing.total_tarjeta + totalTarjeta,
          ultima_actualizacion:
            existing.ultima_actualizacion || ultimaActualizacion,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      b.fecha.localeCompare(a.fecha),
    );
  }, [resumenData, gastosData, selectedLocal]);

  return {
    selectedLocal,
    setSelectedLocal,
    loading,
    localesLoaded,
    localesList,
    resumenData,
    ventasHoraData,
    gastosData,
    dailyResumenData,
    fetchData,
  };
}
