-- ================================================================
-- SUPABASE MIGRATION: Auto-Asignación de empresa_id mediante Triggers
-- Descripción: Permite que los scripts antiguos del local sigan funcionando
--              sin necesidad de modificar el código local. Asigna automáticamente
--              el empresa_id correspondiente consultando la tabla 'locales'.
-- ================================================================

-- 1. Función trigger para auto-asignar empresa_id desde local_id
CREATE OR REPLACE FUNCTION public.auto_assign_empresa_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si empresa_id no viene especificado en la inserción o es NULL
    IF NEW.empresa_id IS NULL AND NEW.local_id IS NOT NULL THEN
        SELECT empresa_id INTO NEW.empresa_id
        FROM public.locales
        WHERE id = NEW.local_id
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Triggers BEFORE INSERT en las tablas operativas
DROP TRIGGER IF EXISTS trg_auto_empresa_gastos ON public.gastos;
CREATE TRIGGER trg_auto_empresa_gastos
BEFORE INSERT OR UPDATE ON public.gastos
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_empresa_id();

DROP TRIGGER IF EXISTS trg_auto_empresa_ventas_diario ON public.ventas_resumen_diario;
CREATE TRIGGER trg_auto_empresa_ventas_diario
BEFORE INSERT OR UPDATE ON public.ventas_resumen_diario
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_empresa_id();

DROP TRIGGER IF EXISTS trg_auto_empresa_ventas_hora ON public.ventas_por_hora;
CREATE TRIGGER trg_auto_empresa_ventas_hora
BEFORE INSERT OR UPDATE ON public.ventas_por_hora
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_empresa_id();

DROP TRIGGER IF EXISTS trg_auto_empresa_empleados ON public.empleados;
CREATE TRIGGER trg_auto_empresa_empleados
BEFORE INSERT OR UPDATE ON public.empleados
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_empresa_id();

-- 3. Trigger especial para fichajes (deriva empresa_id desde la tabla empleados)
CREATE OR REPLACE FUNCTION public.auto_assign_empresa_fichajes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.empresa_id IS NULL AND NEW.empleado_id IS NOT NULL THEN
        SELECT empresa_id INTO NEW.empresa_id
        FROM public.empleados
        WHERE id = NEW.empleado_id
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

-- Añadir columna empresa_id a fichajes si no existe
ALTER TABLE public.fichajes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_auto_empresa_fichajes ON public.fichajes;
CREATE TRIGGER trg_auto_empresa_fichajes
BEFORE INSERT OR UPDATE ON public.fichajes
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_empresa_fichajes();
