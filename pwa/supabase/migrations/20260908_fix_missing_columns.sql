-- ================================================================
-- SUPABASE MIGRATION: Fix Missing Columns & Constraints
-- Description: Ensures coste_hora, pin_empleado, tipo, proveedor exist
--              and drops legacy check constraints on gastos.
-- ================================================================

ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS coste_hora NUMERIC(10,2) DEFAULT 10.00;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS pin_empleado TEXT DEFAULT '0000';
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS pin_admin TEXT DEFAULT '1234';
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS ip_publica TEXT;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'gasto';
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS proveedor TEXT;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_categoria_check;

ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS total_pendiente NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.ventas_por_hora ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.fichajes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
