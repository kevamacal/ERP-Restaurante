import React from "react";
import type { Gasto, CategoriaGasto } from "../types";
import {
  FileText,
  Camera,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  RefreshCw,
} from "lucide-react";

interface GastosSectionProps {
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleOCRScanInvoice: () => void;
  handleOCRFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gastosList: Gasto[];
  requestDeleteGasto: (gasto: Gasto) => void;
  isGastosTableMissing: boolean;
}

export const GastosSection: React.FC<GastosSectionProps> = ({
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
  fileInputRef,
  handleOCRScanInvoice,
  handleOCRFileChange,
  gastosList,
  requestDeleteGasto,
  isGastosTableMissing,
}) => {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleOCRFileChange}
      />

      {/* DESKTOP VIEW */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form & Scanner */}
        <div className="lg:col-span-1 space-y-6">
          {/* Form */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {gastoTipo === "ingreso" ? "Registrar Ingreso Extra" : "Registrar Gasto o Factura"}
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
                      if (gastoCategoria === "Ingreso / Bonificación") setGastoCategoria("Materia Prima");
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${gastoTipo === "gasto"
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
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${gastoTipo === "ingreso"
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
                    placeholder={gastoTipo === "ingreso" ? "Ej. Rappel trimestral cerveza" : "Ej. Compra de verdura"}
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
                      onChange={(e) =>
                        setGastoCategoria(e.target.value as any)
                      }
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                    >
                      <option value="Materia Prima">Materia Prima</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Suministros">Suministros</option>
                      <option value="Gastos de Personal">Gastos de Personal</option>
                      <option value="Ingreso / Bonificación">Ingreso / Bonificación</option>
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
                  className={`w-full py-2 disabled:opacity-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-white flex items-center justify-center gap-1.5 ${gastoTipo === "ingreso"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                >
                  <Plus className="h-4 w-4" /> {gastoTipo === "ingreso" ? "Guardar Ingreso Extra" : "Guardar Gasto"}
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
              Sube una imagen o PDF de tu ticket/factura para escanear y extraer automáticamente el proveedor, la fecha, la categoría y el total mediante Inteligencia Artificial (Gemini Pro/Mindee).
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
                  <div
                    onClick={handleOCRScanInvoice}
                    className="space-y-2 py-2"
                  >
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
                  className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${ocrScanResult.startsWith("✓")
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

        {/* Right Column: Gastos & Ingresos Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-indigo-400" /> Registro de Gastos y Facturas ({gastosList.length})
            </h4>
            {isGastosTableMissing && (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                Modo Local (Sin tabla Supabase)
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-transparent">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Proveedor / Origen</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Importe</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {gastosList.length > 0 ? (
                  gastosList.map((g) => {
                    const isIngreso = g.tipo === "ingreso" || g.categoria === "Ingreso / Bonificación";
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                          {g.fecha}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {g.proveedor || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {g.concepto}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isIngreso
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              }`}
                          >
                            {g.categoria}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                            }`}
                        >
                          {isIngreso ? "+" : "-"}{g.importe.toFixed(2)} €
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => requestDeleteGasto(g)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm bg-slate-900/20">
                      No hay registros de gastos ni facturas agregados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4">
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>{gastoTipo === "ingreso" ? "Ingreso Extra" : "Registrar Gasto"}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Tipo de Operación
            </label>
            <div className="flex bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setGastoTipo("gasto");
                  if (gastoCategoria === "Ingreso / Bonificación") setGastoCategoria("Materia Prima");
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${gastoTipo === "gasto"
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => {
                  setGastoTipo("ingreso");
                  setGastoCategoria("Ingreso / Bonificación");
                }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${gastoTipo === "ingreso"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                Ingreso Extra
              </button>
            </div>
          </div>

          <form onSubmit={handleAddGasto} className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="gastoProvMob"
                className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
              >
                Proveedor / Origen
              </label>
              <input
                id="gastoProvMob"
                type="text"
                value={gastoProveedor}
                onChange={(e) => setGastoProveedor(e.target.value)}
                placeholder="Ej. Distribuidora S.L."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="gastoConceptMob"
                className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
              >
                Concepto *
              </label>
              <input
                id="gastoConceptMob"
                type="text"
                required
                value={gastoConcepto}
                onChange={(e) => setGastoConcepto(e.target.value)}
                placeholder="Ej. Compra de verdura"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="gastoImpMob"
                  className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
                >
                  Importe (€) *
                </label>
                <input
                  id="gastoImpMob"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={gastoImporte}
                  onChange={(e) => setGastoImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="gastoCatMob"
                  className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
                >
                  Categoría *
                </label>
                <select
                  id="gastoCatMob"
                  value={gastoCategoria}
                  onChange={(e) =>
                    setGastoCategoria(e.target.value as any)
                  }
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200"
                >
                  <option value="Materia Prima">Materia Prima</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Suministros">Suministros</option>
                  <option value="Gastos de Personal">Gastos de Personal</option>
                  <option value="Ingreso / Bonificación">Ingreso / Bonificación</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="gastoFechMob"
                className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
              >
                Fecha *
              </label>
              <input
                id="gastoFechMob"
                type="date"
                required
                value={gastoFecha}
                onChange={(e) => setGastoFecha(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-200 font-mono"
              />
            </div>
            <button
              type="submit"
              className={`w-full py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-white flex items-center justify-center gap-1.5 ${gastoTipo === "ingreso" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-500 hover:bg-indigo-600"
                }`}
            >
              <Plus className="h-4 w-4" /> {gastoTipo === "ingreso" ? "Guardar Ingreso" : "Guardar Gasto"}
            </button>
          </form>

          <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Camera className="h-4 w-4" />
              <span>Escanear Factura con IA</span>
            </div>
            <div className="border border-dashed border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white/50 dark:bg-slate-950/20 relative overflow-hidden group">
              {isScanningOCR ? (
                <div className="space-y-2 py-2">
                  <RefreshCw className="h-5 w-5 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                    Procesando imagen con IA...
                  </p>
                </div>
              ) : (
                <div
                  onClick={handleOCRScanInvoice}
                  className="space-y-1.5 py-1"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Subir ticket o factura
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    JPG, PNG, WEBP, PDF
                  </p>
                </div>
              )}
            </div>

            {ocrScanResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-1.5 ${ocrScanResult.startsWith("✓")
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
              >
                {ocrScanResult.startsWith("✓") ? (
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                )}
                <span>{ocrScanResult}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses List Mobile */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 px-1">
            Registro de Gastos e Ingresos
          </h4>
          <div className="space-y-2.5">
            {gastosList.length > 0 ? (
              gastosList.map((g) => {
                const isIngreso = g.tipo === "ingreso" || g.categoria === "Ingreso / Bonificación";
                return (
                  <div
                    key={g.id}
                    className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-850 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                          {g.concepto}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isIngreso
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                        >
                          {g.categoria}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                        {g.fecha} {g.proveedor ? `• ${g.proveedor}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-xs ${isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                          }`}
                      >
                        {isIngreso ? "+" : "-"}{g.importe.toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        onClick={() => requestDeleteGasto(g)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-slate-500 text-xs">
                Sin gastos ni ingresos agregados.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
