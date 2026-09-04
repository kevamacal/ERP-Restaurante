import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabase } from "../supabaseClient";
import type { Local, VentasResumen, VentaHora } from "../types";

export function useDashboardData(isAdminAuthenticated: boolean) {
  const [selectedLocal, setSelectedLocal] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [localesList, setLocalesList] = useState<Local[]>([]);
  const [resumenData, setResumenData] = useState<VentasResumen[]>([]);
  const [ventasHoraData, setVentasHoraData] = useState<VentaHora[]>([]);

  const fetchLocales = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("locales")
        .select("id, nombre, ip_publica")
        .order("id");
      if (!error && data && data.length > 0) {
        setLocalesList([
          { id: "all", nombre: "Todos los Locales" },
          ...data,
        ]);
      }
    } catch (e) {
      console.error("Error cargando locales de Supabase:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      let queryRes = supabase
        .from("ventas_resumen_diario")
        .select("*")
        .order("fecha", { ascending: false });

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
    } catch (e) {
      console.error("Error cargando ventas de Supabase:", e);
    }
    setLoading(false);
  }, [selectedLocal]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAdminAuthenticated]);

  const dailyResumenData = useMemo(() => {
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
  }, [resumenData, selectedLocal]);

  return {
    selectedLocal,
    setSelectedLocal,
    loading,
    localesList,
    resumenData,
    ventasHoraData,
    dailyResumenData,
    fetchData,
  };
}
