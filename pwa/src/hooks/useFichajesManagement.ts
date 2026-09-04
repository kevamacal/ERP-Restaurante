import { useState, useCallback, useEffect } from "react";
import { getSupabase } from "../supabaseClient";
import {
  getRounded30MinISOString,
  getRounded30MinLocalInputString,
} from "../utils/dateUtils";

export function useFichajesManagement(
  selectedLocal: string,
  isAdminAuthenticated: boolean,
  activeTab: string,
  fetchDataTrigger?: () => void
) {
  const [fichajesList, setFichajesList] = useState<any[]>([]);
  const [fichajesAll, setFichajesAll] = useState<any[]>([]);

  // Manual Fichaje Form States
  const [manualEmpId, setManualEmpId] = useState<string>("");
  const [manualTipo, setManualTipo] = useState<"entrada" | "salida">("entrada");
  const [manualFechaHora, setManualFechaHora] = useState<string>(() =>
    getRounded30MinLocalInputString()
  );

  const fetchFichajesData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let queryFic = supabase
        .from("fichajes")
        .select("*, empleados!inner(nombre, local_id)");
      if (selectedLocal !== "all") {
        queryFic = queryFic.eq("empleados.local_id", selectedLocal);
      }
      const { data: ficsData, error: ficsErr } = await queryFic.order(
        "fecha_hora",
        { ascending: true }
      );

      if (ficsErr) {
        console.error("Error fetching fichajes data:", ficsErr);
      }

      if (ficsData) {
        setFichajesAll(ficsData);
        setFichajesList([...ficsData].reverse().slice(0, 50));
      }
    } catch (e) {
      console.error("Error fetching fichajes data:", e);
    }
  }, [selectedLocal]);

  useEffect(() => {
    if (isAdminAuthenticated && (activeTab === "horario" || activeTab === "sales")) {
      fetchFichajesData();
    }
  }, [isAdminAuthenticated, activeTab, selectedLocal, fetchFichajesData]);

  const handleAddManualFichaje = async () => {
    if (!manualEmpId || !manualFechaHora) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const roundedISO = getRounded30MinISOString(manualFechaHora);
      const { error } = await supabase.from("fichajes").insert([
        {
          empleado_id: manualEmpId,
          tipo: manualTipo,
          fecha_hora: roundedISO,
        },
      ]);
      if (!error) {
        setManualEmpId("");
        setManualFechaHora(getRounded30MinLocalInputString());
        fetchFichajesData();
        if (fetchDataTrigger) fetchDataTrigger();
      } else {
        console.error("Error insertando fichaje manual:", error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFichaje = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      const updatedAll = fichajesAll.filter((f) => f.id !== id);
      const updatedList = fichajesList.filter((f) => f.id !== id);
      setFichajesAll(updatedAll);
      setFichajesList(updatedList);
      localStorage.setItem("app_fichajes_fallback", JSON.stringify(updatedAll));
      return;
    }

    try {
      const { error } = await supabase.from("fichajes").delete().eq("id", id);
      if (!error) {
        fetchFichajesData();
        if (fetchDataTrigger) fetchDataTrigger();
      } else {
        console.error("Error deleting fichaje:", error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    fichajesList,
    fichajesAll,
    manualEmpId,
    setManualEmpId,
    manualTipo,
    setManualTipo,
    manualFechaHora,
    setManualFechaHora,
    fetchFichajesData,
    handleAddManualFichaje,
    handleDeleteFichaje,
  };
}
