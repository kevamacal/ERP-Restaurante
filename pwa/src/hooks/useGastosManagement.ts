import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabase } from "../supabaseClient";
import type { Gasto, CategoriaGasto } from "../types";
import { analyzeInvoiceWithGemini } from "../geminiOCR";
import { randomId, readJsonArray, writeJson } from "../utils/localStorage";
import { isGasto } from "../utils/typeGuards";

export type GastosFallbackReason = "sin_supabase" | "tabla_ausente" | null;

export function useGastosManagement(
  selectedLocal: string,
  isAdminAuthenticated: boolean,
  empresaId?: string
) {
  const [gastosList, setGastosList] = useState<Gasto[]>(() =>
    readJsonArray<unknown>("app_gastos_fallback").filter(isGasto)
  );
  const [isGastosTableMissing, setIsGastosTableMissing] = useState<boolean>(false);
  // Motivo por el que los gastos se guardan solo en este navegador.
  const [fallbackReason, setFallbackReason] = useState<GastosFallbackReason>(null);

  // Form states
  const [gastoTipo, setGastoTipo] = useState<"gasto" | "ingreso">("gasto");
  const [gastoConcepto, setGastoConcepto] = useState<string>("");
  const [gastoImporte, setGastoImporte] = useState<string>("");
  const [gastoFecha, setGastoFecha] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [gastoCategoria, setGastoCategoria] = useState<CategoriaGasto>("Materia Prima");
  const [gastoProveedor, setGastoProveedor] = useState<string>("");

  // OCR states
  const [isScanningOCR, setIsScanningOCR] = useState<boolean>(false);
  const [ocrScanResult, setOcrScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGastos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setFallbackReason("sin_supabase");
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

      let query = supabase
        .from("gastos")
        .select("*")
        .order("fecha", { ascending: false });

      if (activeEmpresaId) {
        query = query.eq("empresa_id", activeEmpresaId);
      }
      if (selectedLocal !== "all") {
        query = query.eq("local_id", selectedLocal);
      }
      const { data, error } = await query;
      if (error) {
        if (
          error.code === "PGRST116" ||
          error.message?.includes("does not exist")
        ) {
          setIsGastosTableMissing(true);
          setFallbackReason("tabla_ausente");
        } else {
          console.error("Error fetching gastos:", error);
        }
      } else if (data) {
        setGastosList(data);
        setIsGastosTableMissing(false);
        setFallbackReason(null);
      }
    } catch (e) {
      console.error("Error in fetchGastos:", e);
      setIsGastosTableMissing(true);
      setFallbackReason("tabla_ausente");
    }
  }, [selectedLocal, empresaId]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchGastos();
    }
  }, [isAdminAuthenticated, fetchGastos]);

  const handleAddGasto = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gastoConcepto.trim() || !gastoImporte || !gastoFecha) return;

    const parsedImporte = Number(gastoImporte);
    if (Number.isNaN(parsedImporte)) return;

    const targetLocal = selectedLocal === "all" ? "local_1" : selectedLocal;
    const newGastoRaw = {
      local_id: targetLocal,
      fecha: gastoFecha,
      concepto: gastoConcepto.trim(),
      categoria: gastoCategoria,
      importe: parsedImporte,
      tipo: gastoTipo,
      proveedor: gastoProveedor.trim() || undefined,
    };

    const supabase = getSupabase();
    if (!supabase || isGastosTableMissing) {
      const newGastoWithId = {
        ...newGastoRaw,
        id: randomId("gasto"),
        created_at: new Date().toISOString(),
      } as Gasto;
      const updated = [newGastoWithId, ...gastosList];
      setGastosList(updated);
      writeJson("app_gastos_fallback", updated);

      setGastoConcepto("");
      setGastoImporte("");
      setGastoProveedor("");
      return;
    }

    try {
      const { error } = await supabase.from("gastos").insert([newGastoRaw]);
      if (!error) {
        setGastoConcepto("");
        setGastoImporte("");
        setGastoProveedor("");
        fetchGastos();
      } else {
        console.error("Error adding gasto:", error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGasto = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase || isGastosTableMissing) {
      const updated = gastosList.filter((g) => g.id !== id);
      setGastosList(updated);
      writeJson("app_gastos_fallback", updated);
      return;
    }

    try {
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (!error) {
        fetchGastos();
      } else {
        console.error("Error deleting gasto:", error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOCRScanInvoice = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleOCRFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setIsScanningOCR(true);
    setOcrScanResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const result = await analyzeInvoiceWithGemini(base64String);

        setGastoProveedor(result.proveedor);
        setGastoConcepto(result.concepto);
        setGastoImporte(result.importe.toString());
        setGastoCategoria(result.categoria);
        setGastoFecha(result.fecha);
        setOcrScanResult(
          "✓ ¡Factura escaneada correctamente con Inteligencia Artificial! Revisa los campos completados."
        );
      } catch (err: any) {
        console.error("OCR Error:", err);
        setOcrScanResult(`❌ Error al escanear: ${err.message || err}`);
      } finally {
        setIsScanningOCR(false);
      }
    };

    reader.onerror = () => {
      setOcrScanResult("❌ Error al leer el archivo seleccionado.");
      setIsScanningOCR(false);
    };

    reader.readAsDataURL(file);
  };

  return {
    gastosList,
    isGastosTableMissing,
    fallbackReason,
    gastoTipo,
    setGastoTipo,
    gastoConcepto,
    setGastoConcepto,
    gastoImporte,
    setGastoImporte,
    gastoFecha,
    setGastoFecha,
    gastoCategoria,
    setGastoCategoria,
    gastoProveedor,
    setGastoProveedor,
    isScanningOCR,
    ocrScanResult,
    fileInputRef,
    fetchGastos,
    handleAddGasto,
    handleDeleteGasto,
    handleOCRScanInvoice,
    handleOCRFileChange,
  };
}
