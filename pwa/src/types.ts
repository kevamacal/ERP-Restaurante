export interface Empresa {
  id: string;
  nombre: string;
  owner_user_id?: string;
  plan_subscripcion?: 'free' | 'pro' | 'enterprise';
  pin_admin?: string;
  created_at?: string;
}

export interface TerminalActivado {
  id: string;
  empresa_id: string;
  local_id: string;
  device_token: string;
  nombre_dispositivo?: string;
  last_active_at?: string;
  paired_at?: string;
}

export interface Local {
  id: string;
  empresa_id?: string;
  nombre: string;
  direccion?: string;
  activo?: boolean;
  ip_publica?: string;
}

export interface VentasResumen {
  local_id: string;
  empresa_id?: string;
  fecha: string;
  total_facturado: number;
  num_tickets: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_pendiente?: number;
  ultima_actualizacion: string;
}

export interface VentaHora {
  local_id: string;
  empresa_id?: string;
  fecha: string;
  hora: number;
  total_facturado: number;
  num_tickets: number;
}

export interface SummaryKPI {
  totalFacturado: number;
  numTickets: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalPendiente?: number;
  ticketMedio: number;
  ultimaActualizacion: string;
  comparativaPct: number;
  costePersonal?: number;
  laborCostPct?: number;
  productividad?: number;
  horasTrabajadas?: number;
}

export interface HistoricoItem {
  periodo: string;
  tickets: number;
  ventas: number;
  gastos: number;
  ingresosExtra?: number;
  beneficio: number;
}

export interface Empleado {
  id: string;
  local_id: string;
  empresa_id?: string;
  nombre: string;
  activo: boolean;
  pin_empleado?: string;
  coste_hora?: number;
}

export interface Fichaje {
  id: string;
  empleado_id: string;
  tipo: 'entrada' | 'salida';
  fecha_hora: string;
}

/** Fichaje con el join que hace `useFichajesManagement` sobre `empleados`. */
export interface FichajeConEmpleado extends Fichaje {
  empleados?: {
    nombre: string;
    local_id?: string;
    coste_hora?: number | null;
  } | null;
}

export type CategoriaGasto = 'Materia Prima' | 'Alquiler' | 'Suministros' | 'Gastos de Personal' | 'Ingreso / Bonificación' | 'Otros';

export interface Gasto {
  id: string;
  local_id: string;
  empresa_id?: string;
  fecha: string;
  concepto: string;
  categoria: CategoriaGasto;
  importe: number;
  tipo?: 'gasto' | 'ingreso';
  proveedor?: string;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/* Estadísticas de ventas (RPC de solo lectura)                        */
/* ------------------------------------------------------------------ */

export interface AnalyticsCoverage {
  primera_venta: string | null;
  ultima_venta: string | null;
  primera_hora: string | null;
  ultima_hora: string | null;
  dias_diarios: number;
  dias_horarios: number;
}

export interface AnalyticsPeriodTotals {
  facturado: number;
  tickets: number;
  efectivo: number;
  tarjeta: number;
  pendiente: number;
  dias_con_datos: number;
  dias_horarios: number;
  primera_fecha: string | null;
  ultima_fecha: string | null;
  mejor_fecha: string | null;
  mejor_facturado: number;
  peor_fecha: string | null;
  peor_facturado: number;
}

export interface AnalyticsTimeseriesRow {
  bucket_start: string;
  facturado: number;
  tickets: number;
  efectivo: number;
  tarjeta: number;
  pendiente: number;
  dias_con_datos: number;
}

export interface AnalyticsDailyRow {
  fecha: string;
  facturado: number;
  tickets: number;
  efectivo: number;
  tarjeta: number;
  pendiente: number;
  ultima_actualizacion: string | null;
  total_count: number;
}

export interface AnalyticsHourlyRow {
  /** 1 = lunes … 7 = domingo (ISODOW). */
  dia_semana: number;
  hora: number;
  facturado: number;
  tickets: number;
  dias_con_datos: number;
}

export interface AnalyticsWeekdayRow {
  dia_semana: number;
  facturado: number;
  tickets: number;
  dias_con_datos: number;
}

export interface AnalyticsTopDay {
  fecha: string;
  facturado: number;
  tickets: number;
  ticket_medio: number;
}
