import type { Local, VentasResumen, VentaHora, HistoricoItem } from './types';

export const MOCK_LOCALES: Local[] = [
  { id: 'all', nombre: 'Todos los Locales (Consolidado)' },
  { id: 'local_1', nombre: 'Peña la Milagrosa', direccion: 'Calle Simón de Pineda, 25' },
  { id: 'local_2', nombre: 'El Parrilla', direccion: 'Avenida Carlos Marx' }
];

export const MOCK_RESUMEN_DIARIO: Record<string, VentasResumen[]> = {
  local_1: [
    { local_id: 'local_1', fecha: '2026-07-18', total_facturado: 24.70, num_tickets: 3, total_efectivo: 7.60, total_tarjeta: 17.10, ultima_actualizacion: new Date().toISOString() },
    { local_id: 'local_1', fecha: '2026-07-17', total_facturado: 212.40, num_tickets: 12, total_efectivo: 65.90, total_tarjeta: 146.50, ultima_actualizacion: new Date().toISOString() },
    { local_id: 'local_1', fecha: '2026-07-16', total_facturado: 185.20, num_tickets: 13, total_efectivo: 42.00, total_tarjeta: 143.20, ultima_actualizacion: new Date().toISOString() },
    { local_id: 'local_1', fecha: '2026-07-15', total_facturado: 142.50, num_tickets: 9, total_efectivo: 95.00, total_tarjeta: 47.50, ultima_actualizacion: new Date().toISOString() },
    { local_id: 'local_1', fecha: '2026-07-14', total_facturado: 356.90, num_tickets: 24, total_efectivo: 140.00, total_tarjeta: 216.90, ultima_actualizacion: new Date().toISOString() }
  ],
  local_2: []
};

export const MOCK_VENTAS_HORA: VentaHora[] = [
  { local_id: 'local_1', fecha: '2026-07-17', hora: 12, total_facturado: 18.50, num_tickets: 1 },
  { local_id: 'local_1', fecha: '2026-07-17', hora: 13, total_facturado: 34.00, num_tickets: 2 },
  { local_id: 'local_1', fecha: '2026-07-17', hora: 14, total_facturado: 62.80, num_tickets: 4 },
  { local_id: 'local_1', fecha: '2026-07-17', hora: 15, total_facturado: 25.40, num_tickets: 2 },
  { local_id: 'local_1', fecha: '2026-07-17', hora: 20, total_facturado: 28.90, num_tickets: 1 },
  { local_id: 'local_1', fecha: '2026-07-17', hora: 21, total_facturado: 42.80, num_tickets: 2 }
];

export const MOCK_HISTORICO_ANUAL: HistoricoItem[] = [
  { periodo: 'Año 2026', tickets: 14685, ventas: 80171.55, gastos: 28861.76, beneficio: 51309.79 },
  { periodo: 'Año 2025', tickets: 26416, ventas: 146796.82, gastos: 52846.86, beneficio: 93949.96 },
  { periodo: 'Año 2024', tickets: 32377, ventas: 191361.57, gastos: 68890.17, beneficio: 122471.40 },
  { periodo: 'Año 2023', tickets: 7531, ventas: 37309.30, gastos: 13431.35, beneficio: 23877.95 },
  { periodo: 'Año 2022', tickets: 46075, ventas: 198566.01, gastos: 71483.76, beneficio: 127082.25 }
];

export const MOCK_HISTORICO_MENSUAL: HistoricoItem[] = [
  { periodo: 'Julio 2026', tickets: 855, ventas: 4526.00, gastos: 1584.10, beneficio: 2941.90 },
  { periodo: 'Junio 2026', tickets: 2104, ventas: 10777.11, gastos: 3771.99, beneficio: 7005.12 },
  { periodo: 'Mayo 2026', tickets: 2222, ventas: 12475.40, gastos: 4366.39, beneficio: 8109.01 },
  { periodo: 'Abril 2026', tickets: 2477, ventas: 13798.74, gastos: 4829.56, beneficio: 8969.18 },
  { periodo: 'Marzo 2026', tickets: 3340, ventas: 17145.10, gastos: 6000.78, beneficio: 11144.31 },
  { periodo: 'Febrero 2026', tickets: 2227, ventas: 13128.90, gastos: 4595.11, beneficio: 8533.78 },
  { periodo: 'Enero 2026', tickets: 1460, ventas: 8320.30, gastos: 2912.10, beneficio: 5408.19 },
  { periodo: 'Diciembre 2025', tickets: 1772, ventas: 9721.60, gastos: 3402.56, beneficio: 6319.04 }
];

export const MOCK_HISTORICO_SEMANAL: HistoricoItem[] = [
  { periodo: 'Semana 28 (14-18 Jul)', tickets: 61, ventas: 1071.70, gastos: 364.38, beneficio: 707.32 },
  { periodo: 'Semana 27 (06-12 Jul)', tickets: 93, ventas: 2170.60, gastos: 738.00, beneficio: 1432.60 },
  { periodo: 'Semana 26 (30 Jun - 05 Jul)', tickets: 77, ventas: 1355.80, gastos: 460.97, beneficio: 894.83 },
  { periodo: 'Semana 25 (23-28 Jun)', tickets: 290, ventas: 3976.60, gastos: 1352.04, beneficio: 2624.56 },
  { periodo: 'Semana 24 (16-21 Jun)', tickets: 98, ventas: 2060.80, gastos: 700.67, beneficio: 1360.13 },
  { periodo: 'Semana 23 (09-14 Jun)', tickets: 116, ventas: 2498.90, gastos: 849.63, beneficio: 1649.27 }
];
