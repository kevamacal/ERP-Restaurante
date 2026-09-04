import React from "react";
import type { Gasto, CategoriaGasto } from "../types";
import { GastoFormCard } from "./gastos/GastoFormCard";
import { GastosTable } from "./gastos/GastosTable";

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

export const GastosSection: React.FC<GastosSectionProps> = (props) => {
  return (
    <>
      <input
        ref={props.fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={props.handleOCRFileChange}
      />

      {/* Desktop Grid Layout */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <GastoFormCard
            gastoTipo={props.gastoTipo}
            setGastoTipo={props.setGastoTipo}
            gastoProveedor={props.gastoProveedor}
            setGastoProveedor={props.setGastoProveedor}
            gastoConcepto={props.gastoConcepto}
            setGastoConcepto={props.setGastoConcepto}
            gastoImporte={props.gastoImporte}
            setGastoImporte={props.setGastoImporte}
            gastoCategoria={props.gastoCategoria}
            setGastoCategoria={props.setGastoCategoria}
            gastoFecha={props.gastoFecha}
            setGastoFecha={props.setGastoFecha}
            handleAddGasto={props.handleAddGasto}
            isScanningOCR={props.isScanningOCR}
            ocrScanResult={props.ocrScanResult}
            handleOCRScanInvoice={props.handleOCRScanInvoice}
          />
        </div>

        <div className="lg:col-span-2">
          <GastosTable
            gastosList={props.gastosList}
            requestDeleteGasto={props.requestDeleteGasto}
            isGastosTableMissing={props.isGastosTableMissing}
          />
        </div>
      </div>

      {/* Mobile Stacked Layout */}
      <div className="md:hidden space-y-6">
        <GastoFormCard
          gastoTipo={props.gastoTipo}
          setGastoTipo={props.setGastoTipo}
          gastoProveedor={props.gastoProveedor}
          setGastoProveedor={props.setGastoProveedor}
          gastoConcepto={props.gastoConcepto}
          setGastoConcepto={props.setGastoConcepto}
          gastoImporte={props.gastoImporte}
          setGastoImporte={props.setGastoImporte}
          gastoCategoria={props.gastoCategoria}
          setGastoCategoria={props.setGastoCategoria}
          gastoFecha={props.gastoFecha}
          setGastoFecha={props.setGastoFecha}
          handleAddGasto={props.handleAddGasto}
          isScanningOCR={props.isScanningOCR}
          ocrScanResult={props.ocrScanResult}
          handleOCRScanInvoice={props.handleOCRScanInvoice}
        />

        <GastosTable
          gastosList={props.gastosList}
          requestDeleteGasto={props.requestDeleteGasto}
          isGastosTableMissing={props.isGastosTableMissing}
        />
      </div>
    </>
  );
};
