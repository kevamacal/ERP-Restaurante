import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabase } from "../supabaseClient";
import type { Gasto, CategoriaGasto } from "../types";
import { analyzeInvoiceWithGemini } from "../geminiOCR";

export function useGastosManagement(
  selectedLocal: string,
  isAdminAuthenticated: boolean
) {
  const [gastosList, setGastosList] = useState<Gasto[]>(() => {
    const val = localStorage.getItem("app_gastos_fallback");
    return val ? JSON.parse(val) : [];
  });
  const [isGastosTableMissing, setIsGastosTableMissing] = useState<boolean>(false);

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
    if (!supabase) return;

    try {
      let query = supabase
        .from("gastos")
        .select("*")
        .order("fecha", { ascending: false });
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
        } else {
          console.error("Error fetching gastos:", error);
        }
      } else if (data) {
        setGastosList(data);
        setIsGastosTableMissing(false);
      }
    } catch (e) {
      console.error("Error in fetchGastos:", e);
      setIsGastosTableMissing(true);
    }
  }, [selectedLocal]);

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
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
      } as Gasto;
      const updated = [newGastoWithId, ...gastosList];
      setGastosList(updated);
      localStorage.setItem("app_gastos_fallback", JSON.stringify(updated));

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
      localStorage.setItem("app_gastos_fallback", JSON.stringify(updated));
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
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        if (!apiKey) {
          throw new Error(
            "No se ha configurado la API Key de Gemini en las variables de entorno (VITE_GEMINI_API_KEY)."
          );
        }

        const result = await analyzeInvoiceWithGemini(base64String, apiKey);

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
