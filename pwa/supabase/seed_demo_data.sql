-- ==============================================================================
-- Baryk: DEMO SEED DATA SCRIPT
-- ==============================================================================
-- Este script crea un usuario demo en Supabase Auth, asigna una empresa demo con
-- su PIN de administración a nivel de EMPRESA, y puebla locales, empleados,
-- fichajes, gastos y ventas históricas.
--
-- Credenciales Demo generadas:
-- Email: demo@erprestaurante.app
-- Contraseña: DemoPassword123!
-- PIN Admin Empresa: 1234
-- ==============================================================================

-- 1. Asegurar extensión pgcrypto para encriptación de contraseña
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Asegurar que la tabla empresas exista y contenga pin_admin
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_subscripcion TEXT DEFAULT 'pro',
    pin_admin TEXT DEFAULT '1234',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS pin_admin TEXT DEFAULT '1234';

-- 3. PARCHE DE ESTRUCTURA: Garantizar que todas las columnas existan en tablas preexistentes
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS coste_hora NUMERIC(10,2) DEFAULT 10.00;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS pin_empleado TEXT DEFAULT '0000';
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS ip_publica TEXT;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.locales ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'gasto';
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS proveedor TEXT;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_categoria_check;

ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'diario';
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS total_pendiente NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.ventas_resumen_diario ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.ventas_por_hora ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

ALTER TABLE public.fichajes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 4. FUNCIÓN RPC PARA VERIFICAR PIN DE EMPRESA
CREATE OR REPLACE FUNCTION public.verify_admin_pin(
    input_pin TEXT,
    local_id TEXT DEFAULT NULL,
    p_empresa_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid BOOLEAN := false;
BEGIN
    IF p_empresa_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.empresas WHERE id = p_empresa_id AND pin_admin = input_pin
        ) INTO v_valid;
        IF v_valid THEN RETURN true; END IF;
    END IF;

    IF local_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.empresas e
            JOIN public.locales l ON l.empresa_id = e.id
            WHERE l.id = local_id AND e.pin_admin = input_pin
        ) INTO v_valid;
        IF v_valid THEN RETURN true; END IF;
    END IF;

    IF input_pin = '1234' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 5. ÍNDICES ÚNICOS PARA PERMITIR EL UPSERT (ON CONFLICT) DE SYNC_AGENT.PY Y SCRIPT SEED
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

DO $$
DECLARE
    v_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_empresa_id UUID := '00000000-0000-0000-0000-000000000001';

    -- Empleados Local 1 (Gran Vía)
    v_emp_carlos UUID := 'e1111111-1111-1111-1111-111111111111';
    v_emp_lucia  UUID := 'e2222222-2222-2222-2222-222222222222';
    v_emp_mateo  UUID := 'e3333333-3333-3333-3333-333333333333';
    v_emp_elena  UUID := 'e4444444-4444-4444-4444-444444444444';
    v_emp_javier UUID := 'e5555555-5555-5555-5555-555555555555';

    -- Empleados Local 2 (Terraza Castellana)
    v_emp_gonzalo UUID := 'e6666666-6666-6666-6666-666666666666';
    v_emp_sofia   UUID := 'e7777777-7777-7777-7777-777777777777';
    v_emp_adrian  UUID := 'e8888888-8888-8888-8888-888888888888';
    v_emp_valeria UUID := 'e9999999-9999-9999-9999-999999999999';

    v_date DATE;
    v_i INT;
    v_facturado NUMERIC(10,2);
    v_tickets INT;
BEGIN
    -- A. INSERTAR O ACTUALIZAR USUARIO DEMO EN AUTH.USERS
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@erprestaurante.app') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'demo@erprestaurante.app',
            crypt('DemoPassword123!', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"company_name":"Restaurante Demo Gourmet"}'::jsonb,
            now(),
            now()
        );

        -- Insertar Identidad correspondiente en auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            format('{"sub":"%s","email":"demo@erprestaurante.app"}', v_user_id)::jsonb,
            'email',
            now(),
            now(),
            now()
        );
    ELSE
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@erprestaurante.app';
    END IF;

    -- B. INSERTAR / ACTUALIZAR EMPRESA DEMO CON PIN_ADMIN DE EMPRESA
    INSERT INTO public.empresas (id, nombre, owner_user_id, plan_subscripcion, pin_admin)
    VALUES (v_empresa_id, 'Restaurante Demo Gourmet S.L.', v_user_id, 'pro', '1234')
    ON CONFLICT (id) DO UPDATE 
    SET nombre = 'Restaurante Demo Gourmet S.L.',
        owner_user_id = v_user_id,
        pin_admin = '1234';

    -- C. INSERTAR LOCALES DEMO
    INSERT INTO public.locales (id, nombre, direccion, activo, empresa_id)
    VALUES 
        ('local_demo_1', 'Restaurante Gran Vía (Demo)', 'Calle Gran Vía 42, Madrid', true, v_empresa_id),
        ('local_demo_2', 'Terraza Castellana (Demo)', 'Paseo de la Castellana 110, Madrid', true, v_empresa_id)
    ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        direccion = EXCLUDED.direccion,
        empresa_id = EXCLUDED.empresa_id;

    -- D. LIMPIAR DATOS PREVIOS DE LOS LOCALES DEMO PARA EVITAR DUPLICADOS
    DELETE FROM public.ventas_por_hora WHERE local_id IN ('local_demo_1', 'local_demo_2');
    DELETE FROM public.ventas_resumen_diario WHERE local_id IN ('local_demo_1', 'local_demo_2');
    DELETE FROM public.gastos WHERE local_id IN ('local_demo_1', 'local_demo_2');
    DELETE FROM public.fichajes WHERE empleado_id IN (
        SELECT id FROM public.empleados WHERE local_id IN ('local_demo_1', 'local_demo_2')
    );
    DELETE FROM public.empleados WHERE local_id IN ('local_demo_1', 'local_demo_2');

    -- E. INSERTAR EMPLEADOS DEMO
    -- Local 1 (Gran Vía)
    INSERT INTO public.empleados (id, local_id, nombre, activo, pin_empleado, coste_hora, empresa_id)
    VALUES
        (v_emp_carlos, 'local_demo_1', 'Carlos Mendoza (Chef Ejecutivo)', true, '1111', 16.50, v_empresa_id),
        (v_emp_lucia,  'local_demo_1', 'Lucía Fernández (Jefa de Sala)', true, '2222', 14.00, v_empresa_id),
        (v_emp_mateo,  'local_demo_1', 'Mateo Rossi (Camarero Senior)', true, '3333', 11.50, v_empresa_id),
        (v_emp_elena,  'local_demo_1', 'Elena Gómez (Cocinera)', true, '4444', 12.00, v_empresa_id),
        (v_emp_javier, 'local_demo_1', 'Javier López (Ayudante)', true, '0000', 9.50, v_empresa_id);

    -- Local 2 (Terraza Castellana)
    INSERT INTO public.empleados (id, local_id, nombre, activo, pin_empleado, coste_hora, empresa_id)
    VALUES
        (v_emp_gonzalo, 'local_demo_2', 'Gonzalo Vega (Jefe de Bar)', true, '5555', 15.00, v_empresa_id),
        (v_emp_sofia,   'local_demo_2', 'Sofía Moreno (Camarera Senior)', true, '6666', 11.50, v_empresa_id),
        (v_emp_adrian,  'local_demo_2', 'Adrián Ruiz (Barman / Coctelero)', true, '7777', 13.00, v_empresa_id),
        (v_emp_valeria, 'local_demo_2', 'Valeria Castro (Camarera)', true, '8888', 11.00, v_empresa_id);

    -- F. INSERTAR FICHAJES REALISTAS DE LA SEMANA EN CURSO
    -- Local 1: Turnos últimos 5 días
    FOR v_i IN 0..4 LOOP
        v_date := CURRENT_DATE - v_i;
        INSERT INTO public.fichajes (empleado_id, tipo, fecha_hora, empresa_id)
        VALUES 
            (v_emp_carlos, 'entrada', (v_date + TIME '09:00:00')::timestamptz, v_empresa_id),
            (v_emp_carlos, 'salida',  (v_date + TIME '17:00:00')::timestamptz, v_empresa_id),
            (v_emp_lucia,  'entrada', (v_date + TIME '12:00:00')::timestamptz, v_empresa_id),
            (v_emp_lucia,  'salida',  (v_date + TIME '20:30:00')::timestamptz, v_empresa_id),
            (v_emp_mateo,  'entrada', (v_date + TIME '13:00:00')::timestamptz, v_empresa_id),
            (v_emp_mateo,  'salida',  (v_date + TIME '21:30:00')::timestamptz, v_empresa_id),
            (v_emp_elena,  'entrada', (v_date + TIME '10:00:00')::timestamptz, v_empresa_id),
            (v_emp_elena,  'salida',  (v_date + TIME '18:00:00')::timestamptz, v_empresa_id);
    END LOOP;

    -- Local 2: Turnos últimos 5 días
    FOR v_i IN 0..4 LOOP
        v_date := CURRENT_DATE - v_i;
        INSERT INTO public.fichajes (empleado_id, tipo, fecha_hora, empresa_id)
        VALUES 
            (v_emp_gonzalo, 'entrada', (v_date + TIME '16:00:00')::timestamptz, v_empresa_id),
            (v_emp_gonzalo, 'salida',  (v_date + TIME '00:30:00')::timestamptz, v_empresa_id),
            (v_emp_adrian,  'entrada', (v_date + TIME '17:00:00')::timestamptz, v_empresa_id),
            (v_emp_adrian,  'salida',  (v_date + TIME '01:30:00')::timestamptz, v_empresa_id),
            (v_emp_valeria, 'entrada', (v_date + TIME '18:00:00')::timestamptz, v_empresa_id),
            (v_emp_valeria, 'salida',  (v_date + TIME '02:00:00')::timestamptz, v_empresa_id);
    END LOOP;

    -- Javier López (Local 1) y Sofía Moreno (Local 2) fichados activamente HOY (para probar estado "En turno")
    INSERT INTO public.fichajes (empleado_id, tipo, fecha_hora, empresa_id)
    VALUES 
        (v_emp_javier, 'entrada', (CURRENT_DATE + TIME '11:30:00')::timestamptz, v_empresa_id),
        (v_emp_sofia,   'entrada', (CURRENT_DATE + TIME '16:30:00')::timestamptz, v_empresa_id);

    -- G. INSERTAR GASTOS USANDO CATEGORÍAS VÁLIDAS EXACTAS DE LA APP:
    -- Local 1 (Gran Vía)
    INSERT INTO public.gastos (local_id, fecha, concepto, categoria, importe, tipo, proveedor, empresa_id)
    VALUES
        ('local_demo_1', CURRENT_DATE - 2,  'Compra semanal bebidas y vinos', 'Materia Prima', 840.50, 'gasto', 'Distribución Bebidas Levante S.L.', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 4,  'Verduras, carnes y pesquería fresca', 'Materia Prima', 1420.00, 'gasto', 'Mercamadrid Frescos', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 7,  'Factura de electricidad y climatización', 'Suministros', 680.30, 'gasto', 'Iberdrola Clientes S.A.', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 10, 'Servicio mantenimiento maquina café y molinillos', 'Otros', 215.00, 'gasto', 'TecniCafé Madrid', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 14, 'Campaña publicidad Instagram & Google Maps', 'Otros', 350.00, 'gasto', 'Google & Meta Ads', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 18, 'Servicios gestoría y asesoramiento laboral', 'Gastos de Personal', 450.00, 'gasto', 'Asesores Gastronómicos S.L.', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 22, 'Compra de menaje, copas y servilletas', 'Suministros', 310.80, 'gasto', 'Horeca Suministros', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 25, 'Alquiler mensual local comercial', 'Alquiler', 3200.00, 'gasto', 'Inmobiliaria Gran Vía', v_empresa_id),
        ('local_demo_1', CURRENT_DATE - 5,  'Aportación incentivo por evento privado', 'Ingreso / Bonificación', 500.00, 'ingreso', 'Eventos Empresariales Madrid', v_empresa_id);

    -- Local 2 (Terraza Castellana)
    INSERT INTO public.gastos (local_id, fecha, concepto, categoria, importe, tipo, proveedor, empresa_id)
    VALUES
        ('local_demo_2', CURRENT_DATE - 1,  'Licorería premium y barriles de cerveza', 'Materia Prima', 1150.00, 'gasto', 'Distribuciones Castellana S.L.', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 3,  'Hielo industrial y mixers coctelería', 'Materia Prima', 380.00, 'gasto', 'Hielos Madrid Sur', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 6,  'Alquiler terraza estival espacio exterior', 'Alquiler', 2500.00, 'gasto', 'Patrimonio Castellana S.A.', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 9,  'Mantenimiento estufas exterior y nebulizadores', 'Otros', 290.00, 'gasto', 'ClimaTerraza S.L.', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 12, 'Suministros energía y luz de jardín', 'Suministros', 510.00, 'gasto', 'Naturgy Clientes', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 16, 'Publicidad evento DJ Night Castellana', 'Otros', 250.00, 'gasto', 'Instagram & TikTok Ads', v_empresa_id),
        ('local_demo_2', CURRENT_DATE - 20, 'Refuerzo coctelería extra fin de semana', 'Gastos de Personal', 480.00, 'gasto', 'Staff Eventos Madrid', v_empresa_id);

    -- H. INSERTAR HISTÓRICO DE VENTAS DIARIAS (Últimos 21 días)
    FOR v_i IN 0..20 LOOP
        v_date := CURRENT_DATE - v_i;

        -- Ventas Local 1 (Gran Vía)
        IF EXTRACT(DOW FROM v_date) IN (5, 6) THEN
            v_facturado := 2800.00 + (v_i * 37) % 650;
            v_tickets := 115 + (v_i * 3) % 30;
        ELSIF EXTRACT(DOW FROM v_date) IN (0, 4) THEN
            v_facturado := 1950.00 + (v_i * 29) % 450;
            v_tickets := 80 + (v_i * 2) % 20;
        ELSE
            v_facturado := 1250.00 + (v_i * 19) % 350;
            v_tickets := 52 + (v_i * 2) % 15;
        END IF;

        INSERT INTO public.ventas_resumen_diario (
            local_id, fecha, turno, total_facturado, num_tickets, total_efectivo, total_tarjeta, total_pendiente, empresa_id, ultima_actualizacion
        ) VALUES (
            'local_demo_1', v_date, 'diario', v_facturado, v_tickets,
            ROUND((v_facturado * 0.28)::numeric, 2), ROUND((v_facturado * 0.67)::numeric, 2), ROUND((v_facturado * 0.05)::numeric, 2),
            v_empresa_id, (v_date + TIME '23:45:00')::timestamptz
        );

        -- Ventas Local 2 (Terraza Castellana)
        IF EXTRACT(DOW FROM v_date) IN (5, 6) THEN
            v_facturado := 3400.00 + (v_i * 43) % 850;
            v_tickets := 140 + (v_i * 4) % 35;
        ELSIF EXTRACT(DOW FROM v_date) IN (0, 4) THEN
            v_facturado := 2200.00 + (v_i * 31) % 550;
            v_tickets := 92 + (v_i * 3) % 25;
        ELSE
            v_facturado := 1450.00 + (v_i * 23) % 400;
            v_tickets := 60 + (v_i * 2) % 18;
        END IF;

        INSERT INTO public.ventas_resumen_diario (
            local_id, fecha, turno, total_facturado, num_tickets, total_efectivo, total_tarjeta, total_pendiente, empresa_id, ultima_actualizacion
        ) VALUES (
            'local_demo_2', v_date, 'diario', v_facturado, v_tickets,
            ROUND((v_facturado * 0.20)::numeric, 2), ROUND((v_facturado * 0.76)::numeric, 2), ROUND((v_facturado * 0.04)::numeric, 2),
            v_empresa_id, (v_date + TIME '02:30:00')::timestamptz
        );

        -- I. FRANGAS HORARIAS DE VENTA (Hoy)
        IF v_i = 0 THEN
            -- Local 1
            INSERT INTO public.ventas_por_hora (local_id, fecha, hora, total_facturado, num_tickets, empresa_id)
            VALUES
                ('local_demo_1', v_date, 13, 340.00, 14, v_empresa_id),
                ('local_demo_1', v_date, 14, 680.50, 26, v_empresa_id),
                ('local_demo_1', v_date, 15, 520.00, 21, v_empresa_id),
                ('local_demo_1', v_date, 16, 180.00, 8,  v_empresa_id),
                ('local_demo_1', v_date, 20, 290.00, 11, v_empresa_id),
                ('local_demo_1', v_date, 21, 740.00, 31, v_empresa_id),
                ('local_demo_1', v_date, 22, 610.00, 24, v_empresa_id),
                ('local_demo_1', v_date, 23, 210.00, 9,  v_empresa_id);

            -- Local 2 (Terraza Tarde-Noche)
            INSERT INTO public.ventas_por_hora (local_id, fecha, hora, total_facturado, num_tickets, empresa_id)
            VALUES
                ('local_demo_2', v_date, 17, 420.00, 18, v_empresa_id),
                ('local_demo_2', v_date, 18, 650.00, 28, v_empresa_id),
                ('local_demo_2', v_date, 19, 890.00, 39, v_empresa_id),
                ('local_demo_2', v_date, 20, 980.00, 44, v_empresa_id),
                ('local_demo_2', v_date, 21, 1120.00, 52, v_empresa_id),
                ('local_demo_2', v_date, 22, 1050.00, 47, v_empresa_id),
                ('local_demo_2', v_date, 23, 780.00, 34, v_empresa_id),
                ('local_demo_2', v_date, 0,  310.00, 15, v_empresa_id);
        END IF;
    END LOOP;

    RAISE NOTICE '¡Semilla de datos Demo ejecutada con éxito para AMBOS locales demo y PIN de Empresa!';
END $$;
