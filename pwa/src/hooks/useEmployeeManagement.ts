import { useState, useCallback, useEffect } from "react";
import { getSupabase } from "../supabaseClient";
import type { Empleado } from "../types";

export function useEmployeeManagement(
  selectedLocal: string,
  isAdminAuthenticated: boolean,
  activeTab: string,
  hourlyWage: number
) {
  const [adminEmployees, setAdminEmployees] = useState<Empleado[]>([]);
  const [newEmpName, setNewEmpName] = useState<string>("");
  const [newEmpPin, setNewEmpPin] = useState<string>("0000");

  const fetchEmployees = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let queryEmp = supabase.from("empleados").select("*").order("nombre");
      if (selectedLocal !== "all") {
        queryEmp = queryEmp.eq("local_id", selectedLocal);
      }
      const { data: emps } = await queryEmp;
      if (emps) setAdminEmployees(emps);
    } catch (e) {
      console.error("Error fetching employees:", e);
    }
  }, [selectedLocal]);

  useEffect(() => {
    if (isAdminAuthenticated && (activeTab === "horario" || activeTab === "sales")) {
      fetchEmployees();
    }
  }, [isAdminAuthenticated, activeTab, selectedLocal, fetchEmployees]);

  const handleAddEmployee = async () => {
    if (!newEmpName.trim()) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const targetLocal = selectedLocal === "all" ? "local_1" : selectedLocal;
    try {
      const { error } = await supabase.from("empleados").insert([
        {
          local_id: targetLocal,
          nombre: newEmpName.trim(),
          pin_empleado: newEmpPin || "0000",
          activo: true,
        },
      ]);
      if (!error) {
        setNewEmpName("");
        setNewEmpPin("0000");
        fetchEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEmployeeActive = async (
    id: string,
    currentActive: boolean
  ) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("empleados")
        .update({ activo: !currentActive })
        .eq("id", id);
      if (!error) {
        fetchEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLocalRateChange = (id: string, valStr: string) => {
    const parsed = valStr === "" ? undefined : Number(valStr);
    setAdminEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, coste_hora: parsed } : emp))
    );
  };

  const handleSaveEmployeeRate = async (
    id: string,
    rate: number | undefined | null
  ) => {
    const finalRate =
      rate === undefined || rate === null || Number.isNaN(rate)
        ? hourlyWage
        : rate;

    setAdminEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, coste_hora: finalRate } : emp
      )
    );

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("empleados")
        .update({ coste_hora: finalRate })
        .eq("id", id);

      if (error) {
        console.error("Error updating hourly rate:", error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    adminEmployees,
    setAdminEmployees,
    newEmpName,
    setNewEmpName,
    newEmpPin,
    setNewEmpPin,
    fetchEmployees,
    handleAddEmployee,
    handleToggleEmployeeActive,
    handleLocalRateChange,
    handleSaveEmployeeRate,
  };
}
