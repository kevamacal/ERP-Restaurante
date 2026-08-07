export interface Local {
  id: string;
  nombre: string;
  direccion?: string;
  activo?: boolean;
  ip_publica?: string;
  pin_admin?: string;
}

export interface VentasResumen {
  local_id: string;
  fecha: string;
  total_facturado: number;
  num_tickets: number;
  total_efectivo: number;
  total_tarjeta: number;
  ultima_actualizacion: string;
}

export interface VentaHora {
  local_id: string;
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
  beneficio: number;
}

export interface Empleado {
  id: string;
  local_id: string;
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
