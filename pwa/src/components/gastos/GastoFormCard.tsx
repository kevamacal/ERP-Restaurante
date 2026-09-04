import React from "react";
import type { CategoriaGasto } from "../../types";
import { FileText, Camera, Plus, Check, AlertCircle, RefreshCw } from "lucide-react";

interface GastoFormCardProps {
  gastoTipo: "gasto" | "ingreso";
  setGastoTipo: (val: "gasto" | "ingreso") => void;
  gastoProveedor: string;
  setGastoProveedor: (val: string) => void;
  gastoConcepto: string;
  setGastoConcepto: (val: string) => void;
  gastoImporte: string;
  setGastoImporte: (val: string) => void;
  gastoCategoria: CategoriaGasto;
  setGastoCategoria: (val: CategoriaGasto) => void;
  gastoFecha: string;
  setGastoFecha: (val: string) => void;
  handleAddGasto: (e?: React.FormEvent) => void;
  isScanningOCR: boolean;
  ocrScanResult: string | null;
  handleOCRScanInvoice: () => void;
}

export const GastoFormCard: React.FC<GastoFormCardProps> = ({
  gastoTipo,
  setGastoTipo,
  gastoProveedor,
  setGastoProveedor,
  gastoConcepto,
  setGastoConcepto,
  gastoImporte,
  setGastoImporte,
  gastoCategoria,
  setGastoCategoria,
  gastoFecha,
  setGastoFecha,
  handleAddGasto,
  isScanningOCR,
  ocrScanResult,
  handleOCRScanInvoice,
}) => {
  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <FileText className="h-4 w-4" />{" "}
          {gastoTipo === "ingreso"
            ? "Registrar Ingreso Extra"
            : "Registrar Gasto o Factura"}
        </h4>

        <form onSubmit={handleAddGasto} className="space-y-4">
          {/* Type Selector (Gasto vs Ingreso) */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Tipo de Operación
            </label>
            <div className="flex bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setGastoTipo("gasto");
                  if (gastoCategoria === "Ingreso / Bonificación")
                    setGastoCategoria("Materia Prima");
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                  gastoTipo === "gasto"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Gasto / Factura
              </button>
              <button
                type="button"
                onClick={() => {
                  setGastoTipo("ingreso");
                  setGastoCategoria("Ingreso / Bonificación");
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                  gastoTipo === "ingreso"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Ingreso Extra
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="gastoProv"
                className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
              >
                Proveedor / Origen
              </label>
              <input
                id="gastoProv"
                type="text"
                value={gastoProveedor}
                onChange={(e) => setGastoProveedor(e.target.value)}
                placeholder="Ej. Distribuidora S.L. / Bonificación Heineken"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="gastoConcept"
                className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
              >
                Concepto *
              </label>
              <input
                id="gastoConcept"
                type="text"
                required
                value={gastoConcepto}
                onChange={(e) => setGastoConcepto(e.target.value)}
                placeholder={
                  gastoTipo === "ingreso"
                    ? "Ej. Rappel trimestral cerveza"
                    : "Ej. Compra de verdura"
                }
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="gastoImp"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  Importe (€) *
                </label>
                <input
                  id="gastoImp"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={gastoImporte}
                  onChange={(e) => setGastoImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="gastoCat"
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
                >
                  Categoría *
                </label>
                <select
                  id="gastoCat"
                  value={gastoCategoria}
                  onChange={(e) => setGastoCategoria(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                >
                  <option value="Materia Prima">Materia Prima</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Suministros">Suministros</option>
                  <option value="Gastos de Personal">Gastos de Personal</option>
                  <option value="Ingreso / Bonificación">
                    Ingreso / Bonificación
                  </option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="gastoFech"
                className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
              >
                Fecha *
              </label>
              <input
                id="gastoFech"
                type="date"
                required
                value={gastoFecha}
                onChange={(e) => setGastoFecha(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white flex items-center justify-center gap-1.5 ${
                gastoTipo === "ingreso"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            >
              <Plus className="h-4 w-4" />{" "}
              {gastoTipo === "ingreso"
                ? "Guardar Ingreso Extra"
                : "Guardar Gasto"}
            </button>
          </div>
        </form>
      </div>

      {/* OCR AI Scanner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Escaneo de Facturas con IA
        </h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
          Sube una imagen o PDF de tu ticket/factura para escanear y extraer
          automáticamente el proveedor, la fecha, la categoría y el total
          mediante Inteligencia Artificial (Gemini Pro/Mindee).
        </p>

        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/50 dark:bg-slate-950/40 relative overflow-hidden group">
            {isScanningOCR ? (
              <div className="space-y-2 py-4">
                <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Procesando imagen con IA...
                </p>
              </div>
            ) : (
              <div onClick={handleOCRScanInvoice} className="space-y-2 py-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Seleccionar ticket o factura
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Formatos soportados: JPG, PNG, WEBP, PDF
                  </p>
                </div>
              </div>
            )}
          </div>

          {ocrScanResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                ocrScanResult.startsWith("✓")
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              {ocrScanResult.startsWith("✓") ? (
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{ocrScanResult}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
