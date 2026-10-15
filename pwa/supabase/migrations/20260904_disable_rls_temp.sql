-- ================================================================
-- SUPABASE MIGRATION: Desactivar RLS Temporalmente
-- Descripción: Desactiva Row Level Security en todas las tablas para
--              permitir lecturas/escrituras libres desde scripts del local.
-- ================================================================

-- 1. Desactivar RLS
ALTER TABLE public.empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminales_activados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_resumen_diario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_por_hora DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichajes DISABLE ROW LEVEL SECURITY;

-- Nota: Para reactivar RLS en el futuro, simplemente ejecuta:
-- ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ventas_resumen_diario ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ventas_por_hora ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.fichajes ENABLE ROW LEVEL SECURITY;
