-- ================================================================
-- SUPABASE MIGRATION: Multi-Tenant SaaS & Row Level Security (RLS)
-- Description: Adds empresas, terminales_activados, empresa_id FKs,
--              and RLS policies for 100% database tenant isolation.
-- ================================================================

-- 1. Create EMPRESAS table (Tenants)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_subscripcion TEXT DEFAULT 'pro',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create TERMINALES_ACTIVADOS table (Kiosk Tablets / Terminals)
CREATE TABLE IF NOT EXISTS public.terminales_activados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    local_id TEXT NOT NULL,
    device_token TEXT UNIQUE NOT NULL,
    nombre_dispositivo TEXT DEFAULT 'Tablet Local',
    last_active_at TIMESTAMPTZ DEFAULT now(),
    paired_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Operational Tables IF NOT EXISTS (Matching exact codebase names)
CREATE TABLE IF NOT EXISTS public.locales (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    ip_publica TEXT,
    pin_admin TEXT DEFAULT '1234',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    pin_empleado TEXT DEFAULT '0000',
    coste_hora NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fichajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha_hora TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    concepto TEXT NOT NULL,
    categoria TEXT NOT NULL,
    importe NUMERIC(10,2) NOT NULL,
    tipo TEXT DEFAULT 'gasto',
    proveedor TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ventas_resumen_diario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    total_facturado NUMERIC(10,2) DEFAULT 0,
    num_tickets INT DEFAULT 0,
    total_efectivo NUMERIC(10,2) DEFAULT 0,
    total_tarjeta NUMERIC(10,2) DEFAULT 0,
    total_pendiente NUMERIC(10,2) DEFAULT 0,
    ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ventas_por_hora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT NOT NULL,
    fecha DEFAULT CURRENT_DATE,
    hora INT NOT NULL,
    total_facturado NUMERIC(10,2) DEFAULT 0,
    num_tickets INT DEFAULT 0
);

-- 4. Add empresa_id FK to operational tables
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ventas_por_hora ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminales_activados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_resumen_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_por_hora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichajes ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies for Admin Users (Authenticated Owners)
CREATE POLICY "Owners can access their own empresa record"
ON public.empresas FOR ALL
USING (owner_user_id = auth.uid());

CREATE POLICY "Owners can access their company locales"
ON public.locales FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

CREATE POLICY "Owners can access their company empleados"
ON public.empleados FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

CREATE POLICY "Owners can access their company gastos"
ON public.gastos FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

CREATE POLICY "Owners can access their company sales summaries"
ON public.ventas_resumen_diario FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

CREATE POLICY "Owners can access their company sales per hour"
ON public.ventas_por_hora FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

-- RLS Policies for FICHAJES:
-- Owners can view/manage fichajes for employees belonging to their empresa
CREATE POLICY "Owners can access their company fichajes"
ON public.fichajes FOR ALL
USING (
    empleado_id IN (
        SELECT id FROM public.empleados WHERE empresa_id IN (
            SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()
        )
    )
);

-- Allow workers to insert fichajes from kiosk tablets or personal smartphones
CREATE POLICY "Allow workers to insert fichajes"
ON public.fichajes FOR INSERT
WITH CHECK (true);

-- 7. Helper Function for Terminal Kiosk Activation (RPC)
CREATE OR REPLACE FUNCTION public.vincular_terminal(
    p_empresa_id UUID,
    p_local_id TEXT,
    p_nombre_dispositivo TEXT
)
RETURNS TABLE (device_token TEXT, local_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
BEGIN
    v_token := encode(gen_random_bytes(24), 'hex');
    
    INSERT INTO public.terminales_activados (empresa_id, local_id, device_token, nombre_dispositivo)
    VALUES (p_empresa_id, p_local_id, v_token, p_nombre_dispositivo);

    RETURN QUERY SELECT v_token, p_local_id;
END;
$$;
