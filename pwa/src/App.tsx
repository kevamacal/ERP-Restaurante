import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { KPICard } from "./components/KPICard";
import { SalesChart } from "./components/SalesChart";
import { HistoricoSection } from "./components/HistoricoSection";
import { PeriodSummariesSection } from "./components/PeriodSummariesSection";
import { ClockInView } from "./components/ClockInView";
import { AdminPinLock } from "./components/AdminPinLock";
import { AuthModal } from "./components/auth/AuthModal";
import { OwnerLoginView } from "./components/auth/OwnerLoginView";
import { InstallPrompt } from "./components/InstallPrompt";
import { ConfirmDeleteModal, type DeleteModalState } from "./components/ConfirmDeleteModal";
import { HorarioAdminSection } from "./components/HorarioAdminSection";
import { GastosSection } from "./components/GastosSection";
import { EstadisticasSection } from "./components/estadisticas/EstadisticasSection";

import { useDashboardData } from "./hooks/useDashboardData";
import { useEmployeeManagement } from "./hooks/useEmployeeManagement";
import { useFichajesManagement } from "./hooks/useFichajesManagement";
import { useGastosManagement } from "./hooks/useGastosManagement";
import { useShiftMetrics } from "./hooks/useShiftMetrics";
import { useAuth } from "./hooks/useAuth";
import { useCostSettings } from "./hooks/useCostSettings";

import type { FichajeConEmpleado, Gasto } from "./types";
import {
  Euro,
  Receipt,
  Users,
  Clock,
  Calendar,
  Layers,
  FileText,
  Coins,
  ChartColumn,
} from "lucide-react";

export const App: React.FC = () => {
  // Navigation & Security
  const [view, setView] = useState<"fichar" | "dashboard">("fichar");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    sessionStorage.getItem("admin_authenticated") === "true"
  );
  const [activeTab, setActiveTab] = useState<"sales" | "stats" | "horario" | "gastos">("sales");
  const [mobileTab, setMobileTab] = useState<"summary" | "charts" | "admin">("summary");

  // Auth & Terminal integration
  const auth = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState<boolean>(() => {
    return (
      sessionStorage.getItem("app_terminal_authorized") === "true" ||
      sessionStorage.getItem("admin_authenticated") === "true"
    );
  });

  useEffect(() => {
    if (auth.user) {
      setIsDeviceAuthorized(true);
      sessionStorage.setItem("app_terminal_authorized", "true");
    }
  }, [auth.user]);

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("app_theme") === "light" ? "light" : "dark"
  );

  // Settings states
  const { foodCostPct, hourlyWage, reloadCosts: _reloadCosts } = useCostSettings();
  const [_isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Custom hooks integration
  const empresaId = auth.empresa?.id;
  const dashboardData = useDashboardData(isAdminAuthenticated, empresaId);
  const employeeMgmt = useEmployeeManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated,
    activeTab,
    hourlyWage,
    empresaId
  );
  const fichajesMgmt = useFichajesManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated,
    activeTab,
    dashboardData.fetchData,
    empresaId
  );
  const gastosMgmt = useGastosManagement(
    dashboardData.selectedLocal,
    isAdminAuthenticated,
    empresaId
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
    // `className = theme` borraba las clases base del <body> (tipografía,
    // selección) definidas en index.html. Se añade y se quita solo lo necesario.
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
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

  // Request deletion / confirmation helpers
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

  const requestDeleteFichaje = (fic: FichajeConEmpleado) => {
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

  const requestSignOut = () => {
    setDeleteModalState({
      isOpen: true,
      type: "logout",
      title: "Cerrar Sesión",
      subtitle: "¿Estás seguro de que deseas salir del panel de administración?",
      itemDetails: "Se cerrará la sesión actual y se requerirá autenticación para volver a acceder.",
      confirmText: "Cerrar Sesión",
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState) return;
    const { type, id } = deleteModalState;

    if (type === "logout") {
      setDeleteModalState(null);
      await handleFullSignOut();
      return;
    }

    if (id) {
      if (type === "gasto" || type === "ingreso") {
        await gastosMgmt.handleDeleteGasto(id);
      } else if (type === "fichaje") {
        await fichajesMgmt.handleDeleteFichaje(id);
      }
    }

    setDeleteModalState(null);
  };

  if (!isDeviceAuthorized && !auth.user) {
    return (
      <OwnerLoginView
        locales={dashboardData.localesList}
        onLoginSuccess={() => {
          setIsDeviceAuthorized(true);
          sessionStorage.setItem("app_terminal_authorized", "true");
          setView("fichar");
        }}
      />
    );
  }

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

  const handleFullSignOut = async () => {
    await auth.signOut();
    sessionStorage.removeItem("admin_authenticated");
    sessionStorage.removeItem("app_terminal_authorized");
    setIsAdminAuthenticated(false);
    setIsDeviceAuthorized(false);
    window.location.hash = "";
    setView("fichar");
  };

  if (!isAdminAuthenticated) {
    return (
      <AdminPinLock
        selectedLocalId={selectedLocalId}
        empresaId={auth.empresa?.id}
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={auth.user}
        empresa={auth.empresa}
        onSignOut={requestSignOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Tab Selector & Status Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 pt-2 gap-3">
          {/* Desktop Tab Selector Header */}
          <div className="hidden md:flex bg-stone-100/80 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-1 rounded-2xl gap-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "sales"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <Layers className="h-4 w-4" /> Ventas y Resumen
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("horario")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "horario"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <Clock className="h-4 w-4" /> Fichajes y Personal
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "stats"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <ChartColumn className="h-4 w-4" /> Estadísticas
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("gastos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "gastos"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <FileText className="h-4 w-4" /> Gastos y Facturas
            </button>
          </div>

          {/* Status Pills (Visible on Mobile & Desktop) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full md:w-auto overflow-x-auto">
            {shiftMetrics.kpis.ultimaActualizacion && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] sm:text-xs font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap">
                <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Última act:{" "}
                <span className="text-stone-900 dark:text-stone-100 font-bold font-mono">
                  {new Date(shiftMetrics.kpis.ultimaActualizacion).toLocaleTimeString('es-ES', {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] sm:text-xs font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              {dashboardData.resumenData[0]?.fecha || "Sin ventas cargadas"}
            </span>
          </div>
        </div>

        {/* TAB 1: Ventas y Resumen */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${mobileTab === "summary" ? "block" : "hidden md:block"}`}>
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

            <div className={mobileTab === "charts" ? "block" : "hidden md:block"}>
              <HistoricoSection
                semanal={shiftMetrics.historico.semanal}
                mensual={shiftMetrics.historico.mensual}
                anual={shiftMetrics.historico.anual}
              />
            </div>
          </div>
        )}

        {/* TAB: Estadísticas de ventas */}
        {activeTab === "stats" && (
          <EstadisticasSection
            selectedLocal={dashboardData.selectedLocal}
            empresaId={empresaId}
          />
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
            fallbackReason={gastosMgmt.fallbackReason}
          />
        )}
      </main>

      {/* Mobile Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden glass-panel border border-stone-800/60 dark:border-amber-900/20 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-around backdrop-blur-xl">
        {([
          { key: 'ventas', tab: 'sales' as const, mTab: 'summary' as const, icon: Layers, label: 'Ventas', check: activeTab === 'sales' && mobileTab === 'summary', onClick: () => { setMobileTab('summary'); setActiveTab('sales'); } },
          { key: 'resumen', tab: 'sales' as const, mTab: 'charts' as const, icon: Coins, label: 'Resumen', check: activeTab === 'sales' && mobileTab === 'charts', onClick: () => { setMobileTab('charts'); setActiveTab('sales'); } },
          { key: 'stats', tab: 'stats' as const, mTab: null, icon: ChartColumn, label: 'Stats', check: activeTab === 'stats', onClick: () => setActiveTab('stats') },
          { key: 'horario', tab: 'horario' as const, mTab: null, icon: Clock, label: 'Fichajes', check: activeTab === 'horario', onClick: () => setActiveTab('horario') },
          { key: 'gastos', tab: 'gastos' as const, mTab: null, icon: FileText, label: 'Gastos', check: activeTab === 'gastos', onClick: () => setActiveTab('gastos') },
        ] as const).map(({ key, icon: Icon, label, check, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`relative flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              check ? 'text-amber-400' : 'text-stone-500 dark:text-stone-500 hover:text-stone-300'
            }`}
          >
            {/* Active indicator dot */}
            {check && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-amber-500" />
            )}
            <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${check ? 'scale-110' : ''}`} />
            <span className={`text-[9px] font-semibold tracking-wide ${check ? 'text-amber-400' : ''}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Owner Auth Modal (SaaS Login / Signup) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
        }}
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
