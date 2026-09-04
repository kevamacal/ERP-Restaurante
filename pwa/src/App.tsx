import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { KPICard } from "./components/KPICard";
import { SalesChart } from "./components/SalesChart";
import { HistoricoSection } from "./components/HistoricoSection";
import { PeriodSummariesSection } from "./components/PeriodSummariesSection";
import { ClockInView } from "./components/ClockInView";
import { AdminPinLock } from "./components/AdminPinLock";
import { SettingsModal } from "./components/SettingsModal";
import { InstallPrompt } from "./components/InstallPrompt";
import { ConfirmDeleteModal, type DeleteModalState } from "./components/ConfirmDeleteModal";
import { HorarioAdminSection } from "./components/HorarioAdminSection";
import { GastosSection } from "./components/GastosSection";

import { useDashboardData } from "./hooks/useDashboardData";
import { useEmployeeManagement } from "./hooks/useEmployeeManagement";
import { useFichajesManagement } from "./hooks/useFichajesManagement";
import { useGastosManagement } from "./hooks/useGastosManagement";
import { useShiftMetrics } from "./hooks/useShiftMetrics";

import type { Gasto } from "./types";
import {
  Euro,
  Receipt,
  Users,
  Clock,
  Calendar,
  RefreshCw,
  Layers,
  FileText,
  Coins,
} from "lucide-react";

export const App: React.FC = () => {
  // Navigation & Security
  const [view, setView] = useState<"fichar" | "dashboard">("fichar");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    sessionStorage.getItem("admin_authenticated") === "true"
  );
  const [activeTab, setActiveTab] = useState<"sales" | "horario" | "gastos">("sales");
  const [mobileTab, setMobileTab] = useState<"summary" | "charts" | "admin">("summary");

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("app_theme") as "dark" | "light") || "dark"
  );

  // Settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [foodCostPct, setFoodCostPct] = useState<number>(() => {
    const val = localStorage.getItem("app_food_cost_pct");
    return val ? Number(val) : 30;
  });
  const [hourlyWage, setHourlyWage] = useState<number>(() => {
    const val = localStorage.getItem("app_hourly_wage");
    return val ? Number(val) : 10;
  });

  // Custom hooks integration
  const dashboardData = useDashboardData(isAdminAuthenticated);
  const employeeMgmt = useEmployeeManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated,
    activeTab,
    hourlyWage
  );
  const fichajesMgmt = useFichajesManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated,
    activeTab,
    dashboardData.fetchData
  );
  const gastosMgmt = useGastosManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated
  );
  const shiftMetrics = useShiftMetrics(
    fichajesMgmt.fichajesAll,
    employeeMgmt.adminEmployees,
    dashboardData.resumenData,
    gastosMgmt.gastosList,
    hourlyWage,
    foodCostPct
  );

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState | null>(null);

  // Theme effect
  useEffect(() => {
    document.body.className = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Routing / hash changes listener
  useEffect(() => {
    const handleHashChange = () => {
      const isAdmin =
        window.location.pathname === "/admin" ||
        window.location.hash === "#/admin" ||
        window.location.search.includes("admin");
      setView(isAdmin ? "dashboard" : "fichar");
      if (!isAdmin) {
        setIsAdminAuthenticated(false);
        sessionStorage.removeItem("admin_authenticated");
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Request deletion confirmation helpers
  const requestDeleteGasto = (gasto: Gasto) => {
    const isIngreso =
      gasto.tipo === "ingreso" || gasto.categoria === "Ingreso / Bonificación";
    setDeleteModalState({
      isOpen: true,
      type: isIngreso ? "ingreso" : "gasto",
      id: gasto.id,
      title: isIngreso ? "Eliminar Ingreso Extra" : "Eliminar Gasto",
      itemDetails: `${gasto.concepto} (${gasto.proveedor || "Sin Proveedor"}) — ${gasto.importe.toFixed(2)} €`,
    });
  };

  const requestDeleteFichaje = (fic: any) => {
    const empName = fic.empleados?.nombre || "Empleado";
    const dateObj = new Date(fic.fecha_hora);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setDeleteModalState({
      isOpen: true,
      type: "fichaje",
      id: fic.id,
      title: "Eliminar Registro Horario",
      itemDetails: `Fichaje de ${empName} (${fic.tipo.toUpperCase()}) — ${dateStr} ${timeStr}`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState) return;
    const { type, id } = deleteModalState;

    if (type === "gasto" || type === "ingreso") {
      await gastosMgmt.handleDeleteGasto(id);
    } else if (type === "fichaje") {
      await fichajesMgmt.handleDeleteFichaje(id);
    }

    setDeleteModalState(null);
  };

  const handleSettingsSaved = () => {
    const valFood = localStorage.getItem("app_food_cost_pct");
    if (valFood) setFoodCostPct(Number(valFood));
    const valWage = localStorage.getItem("app_hourly_wage");
    if (valWage) setHourlyWage(Number(valWage));

    dashboardData.fetchData();
    gastosMgmt.fetchGastos();
  };

  if (view === "fichar") {
    return (
      <ClockInView
        locales={dashboardData.localesList}
        onGoToAdmin={() => {
          window.location.hash = "#/admin";
          setView("dashboard");
        }}
      />
    );
  }

  const firstRealLocal = dashboardData.localesList.find((l) => l.id !== "all");
  const selectedLocalId =
    dashboardData.selectedLocal === "all"
      ? firstRealLocal?.id || "local_1"
      : dashboardData.selectedLocal;

  if (!isAdminAuthenticated) {
    return (
      <AdminPinLock
        selectedLocalId={selectedLocalId}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem("admin_authenticated", "true");
        }}
        onGoToFichar={() => {
          window.location.hash = "#/fichar";
          setView("fichar");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 pb-24 md:pb-12">
      <Header
        locales={dashboardData.localesList}
        selectedLocal={dashboardData.selectedLocal}
        onSelectLocal={dashboardData.setSelectedLocal}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={dashboardData.fetchData}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Desktop Tab Selector Header */}
        <div className="hidden md:flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 pt-2">
          <div className="flex bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "sales"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" /> Ventas y Resumen
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("horario")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "horario"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" /> Fichajes y Personal
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gastos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "gastos"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" /> Gastos y Facturas
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              {dashboardData.resumenData[0]?.fecha || "Sin ventas cargadas"}
            </span>

            <button
              type="button"
              onClick={dashboardData.fetchData}
              disabled={dashboardData.loading}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${dashboardData.loading ? "animate-spin" : ""}`}
              />
              Sincronizar
            </button>
          </div>
        </div>

        {/* TAB 1: Ventas y Resumen */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KPICard
                title="Total Facturado"
                value={`${shiftMetrics.kpis.totalFacturado.toFixed(2)} €`}
                subtitle="Ingreso total acumulado en caja"
                icon={Euro}
                color="emerald"
              />

              <KPICard
                title="Tickets Emitidos"
                value={`${shiftMetrics.kpis.numTickets}`}
                subtitle={`Ticket medio: ${shiftMetrics.kpis.ticketMedio.toFixed(2)} €`}
                icon={Receipt}
                color="indigo"
                badgeText="Operaciones"
              />

              <KPICard
                title="Coste Personal Est."
                value={`${(shiftMetrics.kpis.costePersonal || 0).toFixed(2)} €`}
                subtitle={`${(shiftMetrics.kpis.horasTrabajadas || 0).toFixed(1)}h fichadas | ${(shiftMetrics.kpis.laborCostPct || 0).toFixed(1)}% ventas`}
                icon={Users}
                color="violet"
              />

              <KPICard
                title="Pendiente por Cobrar"
                value={`${(shiftMetrics.kpis.totalPendiente || 0).toFixed(2)} €`}
                subtitle="Dinero total acumulado por cobrar"
                icon={Clock}
                color="amber"
              />
            </div>

            <div className={mobileTab === "summary" ? "block" : "hidden md:block"}>
              <PeriodSummariesSection
                resumenData={dashboardData.resumenData}
                dailyWorkedHours={shiftMetrics.dailyWorkedHours}
                dailyCost={shiftMetrics.shiftMetrics.dailyCost}
                foodCostPct={foodCostPct}
                gastosList={gastosMgmt.gastosList}
              />
            </div>

            <div className={mobileTab === "charts" ? "block" : "hidden md:block"}>
              <SalesChart
                ventasHora={dashboardData.ventasHoraData}
                totalEfectivo={shiftMetrics.kpis.totalEfectivo}
                totalTarjeta={shiftMetrics.kpis.totalTarjeta}
              />
            </div>

            <div className={mobileTab === "summary" ? "block" : "hidden md:block"}>
              <HistoricoSection
                semanal={shiftMetrics.historico.semanal}
                mensual={shiftMetrics.historico.mensual}
                anual={shiftMetrics.historico.anual}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Control Horario / Fichajes */}
        {activeTab === "horario" && (
          <HorarioAdminSection
            adminEmployees={employeeMgmt.adminEmployees}
            newEmpName={employeeMgmt.newEmpName}
            setNewEmpName={employeeMgmt.setNewEmpName}
            newEmpPin={employeeMgmt.newEmpPin}
            setNewEmpPin={employeeMgmt.setNewEmpPin}
            handleAddEmployee={employeeMgmt.handleAddEmployee}
            manualEmpId={fichajesMgmt.manualEmpId}
            setManualEmpId={fichajesMgmt.setManualEmpId}
            manualTipo={fichajesMgmt.manualTipo}
            setManualTipo={fichajesMgmt.setManualTipo}
            manualFechaHora={fichajesMgmt.manualFechaHora}
            setManualFechaHora={fichajesMgmt.setManualFechaHora}
            handleAddManualFichaje={fichajesMgmt.handleAddManualFichaje}
            handleToggleEmployeeActive={employeeMgmt.handleToggleEmployeeActive}
            handleLocalRateChange={employeeMgmt.handleLocalRateChange}
            handleSaveEmployeeRate={employeeMgmt.handleSaveEmployeeRate}
            hourlyWage={hourlyWage}
            weeklyPaymentsData={shiftMetrics.weeklyPaymentsData}
            weekOffset={shiftMetrics.weekOffset}
            setWeekOffset={shiftMetrics.setWeekOffset}
            fichajesList={fichajesMgmt.fichajesList}
            requestDeleteFichaje={requestDeleteFichaje}
          />
        )}

        {/* TAB 3: Gastos y Facturas */}
        {activeTab === "gastos" && (
          <GastosSection
            gastoTipo={gastosMgmt.gastoTipo}
            setGastoTipo={gastosMgmt.setGastoTipo}
            gastoProveedor={gastosMgmt.gastoProveedor}
            setGastoProveedor={gastosMgmt.setGastoProveedor}
            gastoConcepto={gastosMgmt.gastoConcepto}
            setGastoConcepto={gastosMgmt.setGastoConcepto}
            gastoImporte={gastosMgmt.gastoImporte}
            setGastoImporte={gastosMgmt.setGastoImporte}
            gastoCategoria={gastosMgmt.gastoCategoria}
            setGastoCategoria={gastosMgmt.setGastoCategoria}
            gastoFecha={gastosMgmt.gastoFecha}
            setGastoFecha={gastosMgmt.setGastoFecha}
            handleAddGasto={gastosMgmt.handleAddGasto}
            isScanningOCR={gastosMgmt.isScanningOCR}
            ocrScanResult={gastosMgmt.ocrScanResult}
            fileInputRef={gastosMgmt.fileInputRef}
            handleOCRScanInvoice={gastosMgmt.handleOCRScanInvoice}
            handleOCRFileChange={gastosMgmt.handleOCRFileChange}
            gastosList={gastosMgmt.gastosList}
            requestDeleteGasto={requestDeleteGasto}
            isGastosTableMissing={gastosMgmt.isGastosTableMissing}
          />
        )}
      </main>

      {/* Mobile Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden glass-panel border border-slate-800/80 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-around backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            setMobileTab("summary");
            setActiveTab("sales");
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "sales" && mobileTab === "summary"
              ? "bg-indigo-500/20 text-indigo-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span className="text-[10px]">Ventas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab("charts");
            setActiveTab("sales");
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "sales" && mobileTab === "charts"
              ? "bg-indigo-500/20 text-indigo-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span className="text-[10px]">Resumen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("horario")}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "horario"
              ? "bg-indigo-500/20 text-indigo-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="text-[10px]">Fichajes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gastos")}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "gastos"
              ? "bg-indigo-500/20 text-indigo-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="text-[10px]">Gastos</span>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        modalState={deleteModalState}
        onClose={() => setDeleteModalState(null)}
        onConfirm={handleConfirmDelete}
      />

      <InstallPrompt />
    </div>
  );
};

export default App;
