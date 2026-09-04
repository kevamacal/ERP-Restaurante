import React from "react";
import type { Empleado } from "../types";
import { EmployeeManagementCard } from "./horario/EmployeeManagementCard";
import { ManualClockInCard } from "./horario/ManualClockInCard";
import { WeeklyPaymentsTable } from "./horario/WeeklyPaymentsTable";
import { FichajesHistoryTable } from "./horario/FichajesHistoryTable";

interface HorarioAdminSectionProps {
  adminEmployees: Empleado[];
  newEmpName: string;
  setNewEmpName: (val: string) => void;
  newEmpPin: string;
  setNewEmpPin: (val: string) => void;
  handleAddEmployee: () => void;
  manualEmpId: string;
  setManualEmpId: (val: string) => void;
  manualTipo: "entrada" | "salida";
  setManualTipo: (val: "entrada" | "salida") => void;
  manualFechaHora: string;
  setManualFechaHora: (val: string) => void;
  handleAddManualFichaje: () => void;
  handleToggleEmployeeActive: (id: string, active: boolean) => void;
  handleLocalRateChange: (id: string, val: string) => void;
  handleSaveEmployeeRate: (id: string, val: number | undefined) => void;
  hourlyWage: number;
  weeklyPaymentsData: {
    mondayDate: Date;
    sundayDate: Date;
    list: Array<{ id: string; name: string; hours: number; rate: number; total: number }>;
    grandTotal: number;
  };
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  fichajesList: any[];
  requestDeleteFichaje: (fic: any) => void;
}

export const HorarioAdminSection: React.FC<HorarioAdminSectionProps> = (props) => {
  return (
    <>
      {/* Desktop Grid Layout */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <EmployeeManagementCard
            adminEmployees={props.adminEmployees}
            newEmpName={props.newEmpName}
            setNewEmpName={props.setNewEmpName}
            newEmpPin={props.newEmpPin}
            setNewEmpPin={props.setNewEmpPin}
            handleAddEmployee={props.handleAddEmployee}
            handleToggleEmployeeActive={props.handleToggleEmployeeActive}
            handleLocalRateChange={props.handleLocalRateChange}
            handleSaveEmployeeRate={props.handleSaveEmployeeRate}
            hourlyWage={props.hourlyWage}
          />

          <ManualClockInCard
            adminEmployees={props.adminEmployees}
            manualEmpId={props.manualEmpId}
            setManualEmpId={props.setManualEmpId}
            manualTipo={props.manualTipo}
            setManualTipo={props.setManualTipo}
            manualFechaHora={props.manualFechaHora}
            setManualFechaHora={props.setManualFechaHora}
            handleAddManualFichaje={props.handleAddManualFichaje}
          />

          <WeeklyPaymentsTable
            weeklyPaymentsData={props.weeklyPaymentsData}
            weekOffset={props.weekOffset}
            setWeekOffset={props.setWeekOffset}
          />
        </div>

        <div className="lg:col-span-2">
          <FichajesHistoryTable
            fichajesList={props.fichajesList}
            requestDeleteFichaje={props.requestDeleteFichaje}
          />
        </div>
      </div>

      {/* Mobile Stacked Layout */}
      <div className="md:hidden space-y-6">
        <EmployeeManagementCard
          adminEmployees={props.adminEmployees}
          newEmpName={props.newEmpName}
          setNewEmpName={props.setNewEmpName}
          newEmpPin={props.newEmpPin}
          setNewEmpPin={props.setNewEmpPin}
          handleAddEmployee={props.handleAddEmployee}
          handleToggleEmployeeActive={props.handleToggleEmployeeActive}
          handleLocalRateChange={props.handleLocalRateChange}
          handleSaveEmployeeRate={props.handleSaveEmployeeRate}
          hourlyWage={props.hourlyWage}
        />

        <ManualClockInCard
          adminEmployees={props.adminEmployees}
          manualEmpId={props.manualEmpId}
          setManualEmpId={props.setManualEmpId}
          manualTipo={props.manualTipo}
          setManualTipo={props.setManualTipo}
          manualFechaHora={props.manualFechaHora}
          setManualFechaHora={props.setManualFechaHora}
          handleAddManualFichaje={props.handleAddManualFichaje}
        />

        <WeeklyPaymentsTable
          weeklyPaymentsData={props.weeklyPaymentsData}
          weekOffset={props.weekOffset}
          setWeekOffset={props.setWeekOffset}
        />

        <FichajesHistoryTable
          fichajesList={props.fichajesList}
          requestDeleteFichaje={props.requestDeleteFichaje}
        />
      </div>
    </>
  );
};
