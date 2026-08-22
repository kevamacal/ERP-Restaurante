export interface OCRInvoiceResult {
  proveedor: string;
  concepto: string;
  importe: number;
  categoria: "Materia Prima" | "Alquiler" | "Suministros" | "Otros";
  fecha: string;
}

/**
 * Sends a base64 encoded invoice image/PDF to the Gemini API to extract details.
 * Constrains the output to a strict JSON structure.
 */
export async function analyzeInvoiceWithGemini(
  fileBase64: string,
  apiKey: string,
): Promise<OCRInvoiceResult> {
  if (!apiKey) {
    throw new Error("No se ha proporcionado la API Key de Gemini.");
  }

  // Parse mimeType and raw base64 data
  let mimeType = "image/jpeg";
  let base64Data = fileBase64;

  if (fileBase64.startsWith("data:")) {
    const parts = fileBase64.split(";base64,");
    if (parts.length === 2) {
      base64Data = parts[1];
      const mimeMatch = /data:(.*?)$/.exec(parts[0]);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }
  }

  const prompt = `Analiza la imagen o PDF de este ticket de compra o factura. 
Extrae y devuelve de forma precisa el nombre del proveedor, un concepto resumido del gasto, el importe total pagado con impuestos incluidos, la categoría correspondiente y la fecha de emisión.
Si algún campo no es legible o no se encuentra:
- Para la fecha, usa la fecha actual de hoy en formato YYYY-MM-DD.
- Para el concepto, usa un resumen de los productos visibles (ej. "Compra de verduras y bebidas").
- Para la categoría, clasifícalo en uno de los valores permitidos.`;

  // Modelo económico y rápido: gemini-3.5-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Error en API de Gemini (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  // Extract text from the candidate response content
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("La respuesta de Gemini no contiene texto estructurado.");
  }

  try {
    const result = JSON.parse(text.trim()) as OCRInvoiceResult;
    return result;
  } catch (err) {
    console.error("Error parsing JSON from Gemini output:", err, text);
    throw new Error(
      "La respuesta devuelta por la IA no tiene un formato JSON válido.",
      { cause: err },
    );
  }
}

/**
 * Compresses an image file if it exceeds the max width/height, returning a base64 string.
 * Keeps the aspect ratio. If it's not an image (e.g. PDF), it reads it directly as base64.
 */
export function compressImageIfNeeded(file: File, maxWidth = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      // PDF or other files are read directly
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Error leyendo el archivo."));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string); // Fallback to original base64
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export to JPEG with 0.8 quality to reduce token count and file size drastically
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen para compresión."));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo de imagen."));
    reader.readAsDataURL(file);
  });
}

