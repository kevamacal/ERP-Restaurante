import { getSupabase } from "./supabaseClient";

export interface OCRInvoiceResult {
  proveedor: string;
  concepto: string;
  importe: number;
  categoria: "Materia Prima" | "Alquiler" | "Suministros" | "Otros";
  fecha: string;
}

// Debe coincidir con el límite de la Edge Function (analyze-invoice).
const MAX_BASE64_CHARS = 8 * 1024 * 1024;

/**
 * Envía una factura (data URL base64) a la Edge Function `analyze-invoice`,
 * que guarda la API key de Gemini en el servidor. El navegador nunca ve la key.
 */
export async function analyzeInvoiceWithGemini(
  fileBase64: string,
): Promise<OCRInvoiceResult> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase no está configurado en esta instalación.");
  }

  const { mimeType, base64Data } = parseDataUrl(fileBase64);
  if (base64Data.length > MAX_BASE64_CHARS) {
    throw new Error("El archivo es demasiado grande (máximo ~6 MB).");
  }

  const { data, error } = await supabase.functions.invoke<OCRInvoiceResult>(
    "analyze-invoice",
    { body: { mimeType, data: base64Data } },
  );

  if (error) {
    throw new Error(await describeFunctionError(error));
  }

  if (!data) {
    throw new Error("El servicio de OCR no devolvió ningún resultado.");
  }

  return data;
}

function parseDataUrl(fileBase64: string): {
  mimeType: string;
  base64Data: string;
} {
  if (!fileBase64.startsWith("data:")) {
    // Compatibilidad con llamadas antiguas que pasaban solo el base64.
    return { mimeType: "image/jpeg", base64Data: fileBase64 };
  }

  const [header, body] = fileBase64.split(";base64,");
  const mimeType = /^data:(.+)$/.exec(header)?.[1] || "image/jpeg";

  if (!body) {
    throw new Error("El archivo seleccionado no se pudo leer correctamente.");
  }

  return { mimeType, base64Data: body };
}

/**
 * `functions.invoke` devuelve un FunctionsHttpError que encapsula la Response
 * del servidor. Extraemos el mensaje `{ error }` para no enseñar "Edge Function
 * returned a non-2xx status code" en la UI.
 */
async function describeFunctionError(error: unknown): Promise<string> {
  if (typeof error === "object" && error !== null && "context" in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const body: unknown = await context.clone().json();
        if (
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
        ) {
          return (body as { error: string }).error;
        }
      } catch {
        // Sin cuerpo JSON: caemos al mensaje genérico.
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo procesar la factura con el servicio de OCR.";
}
