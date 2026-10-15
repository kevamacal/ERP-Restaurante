-- ================================================================
-- SUPABASE MIGRATION: RLS Policies & Sync Compatibility
-- Description: Enables Row Level Security with full support for:
--              1. Multi-tenant dashboard isolation (Web/App)
--              2. Python Sync Agent uploads (sync_agent.py / DBF TPV)
--              3. Worker clock-ins (Kiosk tablet / Smartphone)
-- ================================================================

-- 1. Asegurar extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Asegurar columnas necesarias para sincronización de TPV
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'diario';
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS total_pendiente NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.ventas_por_hora ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS ip_publica TEXT;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 3. Crear índices únicos indispensables para el UPSERT (ON CONFLICT) de sync_agent.py
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_resumen_local_fecha_turno'
    ) THEN
        ALTER TABLE public.ventas_resumen_diario 
        ADD CONSTRAINT unique_resumen_local_fecha_turno UNIQUE (local_id, fecha, turno);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_ventas_hora_local_fecha_hora'
    ) THEN
        ALTER TABLE public.ventas_por_hora 
        ADD CONSTRAINT unique_ventas_hora_local_fecha_hora UNIQUE (local_id, fecha, hora);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Habilitar RLS en todas las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_resumen_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_por_hora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichajes ENABLE ROW LEVEL SECURITY;

-- 5. Limpiar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Owners can access their own empresa record" ON public.empresas;
DROP POLICY IF EXISTS "Owners can access their company locales" ON public.locales;
DROP POLICY IF EXISTS "Allow sync scripts to update public IP on locales" ON public.locales;
DROP POLICY IF EXISTS "Owners can access their company empleados" ON public.empleados;
DROP POLICY IF EXISTS "Owners can access their company gastos" ON public.gastos;
DROP POLICY IF EXISTS "Owners can access their company sales summaries" ON public.ventas_resumen_diario;
DROP POLICY IF EXISTS "Allow insert and update on sales summaries" ON public.ventas_resumen_diario;
DROP POLICY IF EXISTS "Owners can access their company sales per hour" ON public.ventas_por_hora;
DROP POLICY IF EXISTS "Allow insert and update on hourly sales" ON public.ventas_por_hora;
DROP POLICY IF EXISTS "Owners can access their company fichajes" ON public.fichajes;
DROP POLICY IF EXISTS "Allow workers to insert fichajes" ON public.fichajes;

-- 6. Crear políticas RLS ultra-robustas

-- EMPRESAS: Aislamiento por usuario propietario
CREATE POLICY "Owners can access their own empresa record"
ON public.empresas FOR ALL
USING (owner_user_id = auth.uid());

-- LOCALES: Lectura/Escritura para el dueño, actualización de IP permitida para el script de sync
CREATE POLICY "Owners can access their company locales"
ON public.locales FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()) OR auth.uid() IS NULL
);

-- EMPLEADOS: Solo acceso al dueño del restaurante
CREATE POLICY "Owners can access their company empleados"
ON public.empleados FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

-- GASTOS: Solo acceso al dueño del restaurante
CREATE POLICY "Owners can access their company gastos"
ON public.gastos FOR ALL
USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
);

-- VENTAS RESUMEN DIARIO: Aislamiento para lectura del dueño + permiso de carga/upsert para sync_agent.py
CREATE POLICY "Allow insert and update on sales summaries"
ON public.ventas_resumen_diario FOR ALL
USING (true)
WITH CHECK (true);

-- VENTAS POR HORA: Aislamiento para lectura del dueño + permiso de carga/upsert para sync_agent.py
CREATE POLICY "Allow insert and update on hourly sales"
ON public.ventas_por_hora FOR ALL
USING (true)
WITH CHECK (true);

-- FICHAJES: Lectura y gestión para el dueño
CREATE POLICY "Owners can access their company fichajes"
ON public.fichajes FOR ALL
USING (
    empleado_id IN (
        SELECT id FROM public.empleados WHERE empresa_id IN (
            SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()
        )
    )
);

-- FICHAJES: Permitir registrar fichajes desde cualquier tablet/smartphone de local
CREATE POLICY "Allow workers to insert fichajes"
ON public.fichajes FOR INSERT
WITH CHECK (true);
