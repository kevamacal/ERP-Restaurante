// Edge Function: proxy autenticado entre la PWA y Gemini.
//
// La API key de Gemini vive como secreto del servidor (GEMINI_API_KEY) y nunca
// llega al navegador. El frontend llama a esta función con la sesión de
// Supabase; el gateway valida el JWT antes de ejecutarla (verify_jwt = true).

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

// Gemini limita el payload inline a ~20 MB. Nos quedamos muy por debajo para
// no gastar memoria ni cuota en facturas que no van a procesarse.
const MAX_BASE64_CHARS = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const CATEGORIAS = new Set(["Materia Prima", "Alquiler", "Suministros", "Otros"]);

interface OCRInvoiceResult {
  proveedor: string;
  concepto: string;
  importe: number;
  categoria: "Materia Prima" | "Alquiler" | "Suministros" | "Otros";
  fecha: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Normaliza la respuesta del modelo: nunca confiamos en el JSON generado. */
function normalizeResult(raw: unknown): OCRInvoiceResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("respuesta_no_objeto");
  }

  const data = raw as Record<string, unknown>;
  const importe = typeof data.importe === "number" ? data.importe : Number(data.importe);
  if (!Number.isFinite(importe) || importe < 0) {
    throw new Error("importe_invalido");
  }

  const categoria = typeof data.categoria === "string" && CATEGORIAS.has(data.categoria)
    ? data.categoria
    : "Otros";

  const fecha = typeof data.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)
    ? data.fecha
    : todayISO();

  const proveedor = typeof data.proveedor === "string" ? data.proveedor.trim() : "";
  const concepto = typeof data.concepto === "string" ? data.concepto.trim() : "";

  if (!proveedor && !concepto) {
    throw new Error("respuesta_vacia");
  }

  return {
    proveedor: proveedor || "Proveedor desconocido",
    concepto: concepto || "Gasto sin concepto",
    importe: Math.round(importe * 100) / 100,
    categoria: categoria as OCRInvoiceResult["categoria"],
    fecha,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Método no permitido.", 405);
  }

  if (!GEMINI_API_KEY) {
    console.error("analyze-invoice: falta el secreto GEMINI_API_KEY");
    return errorResponse("El OCR no está configurado en el servidor.", 503);
  }

  let payload: { mimeType?: unknown; data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("El cuerpo de la petición no es JSON válido.", 400);
  }

  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "";
  const base64Data = typeof payload.data === "string" ? payload.data : "";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return errorResponse("Formato de archivo no admitido.", 415);
  }

  if (!base64Data || base64Data.length > MAX_BASE64_CHARS) {
    return errorResponse("El archivo está vacío o supera el tamaño máximo.", 413);
  }

  // Validación barata: base64 solo admite este alfabeto. Evita reenviar basura.
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64Data)) {
    return errorResponse("El archivo no está codificado en base64.", 400);
  }

  const prompt = `Analiza la imagen o PDF de este ticket de compra o factura.
Extrae y devuelve de forma precisa el nombre del proveedor, un concepto resumido del gasto, el importe total pagado con impuestos incluidos, la categoría correspondiente y la fecha de emisión.
Si algún campo no es legible o no se encuentra:
- Para la fecha, usa la fecha actual de hoy en formato YYYY-MM-DD.
- Para el concepto, usa un resumen de los productos visibles (ej. "Compra de verduras y bebidas").
- Para la categoría, clasifícalo en uno de los valores permitidos.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          proveedor: {
            type: "STRING",
            description: "Nombre de la empresa o proveedor",
          },
          concepto: {
            type: "STRING",
            description: "Concepto o descripción breve de la compra",
          },
          importe: {
            type: "NUMBER",
            description: "Monto total de la factura, con impuestos incluidos",
          },
          categoria: {
            type: "STRING",
            enum: ["Materia Prima", "Alquiler", "Suministros", "Otros"],
            description: "Categoría aplicable al gasto",
          },
          fecha: {
            type: "STRING",
            description: "Fecha en formato YYYY-MM-DD",
          },
        },
        required: ["proveedor", "concepto", "importe", "categoria", "fecha"],
      },
    },
  };

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // La clave va en cabecera, no en la URL: así no queda en logs de proxy.
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (err) {
    console.error("analyze-invoice: error de red contra Gemini", err);
    return errorResponse("No se pudo contactar con el servicio de OCR.", 502);
  }

  if (!geminiResponse.ok) {
    // No devolvemos el cuerpo de Google al cliente: puede filtrar detalles internos.
    const details = await geminiResponse.text();
    console.error(`analyze-invoice: Gemini respondió ${geminiResponse.status}: ${details}`);
    return errorResponse("El servicio de OCR rechazó la factura. Inténtalo de nuevo.", 502);
  }

  const geminiData = await geminiResponse.json();
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || !text.trim()) {
    return errorResponse("La respuesta del OCR no contiene datos.", 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch (err) {
    console.error("analyze-invoice: JSON inválido del modelo", err, text);
    return errorResponse("El OCR devolvió un formato no válido.", 502);
  }

  try {
    return jsonResponse(normalizeResult(parsed));
  } catch (err) {
    console.error("analyze-invoice: resultado incompleto", err, parsed);
    return errorResponse("El OCR no ha podido leer los datos de la factura.", 422);
  }
});
