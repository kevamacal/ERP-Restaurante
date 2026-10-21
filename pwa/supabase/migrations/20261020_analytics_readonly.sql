-- Estadísticas de ventas de solo lectura.
--
-- Por qué existe: el dashboard actual solo trae el desglose horario del último
-- día y PostgREST corta a 1.000 filas. Para comparar horas entre semanas o
-- meses hace falta agregar en Postgres, no en el navegador.
--
-- Esta migración NO toca columnas, tablas de ventas ni el payload del agente.
-- Tampoco cambia políticas RLS: el panel se usa también con PIN y sin sesión de
-- Supabase, así que cerrar la lectura anónima rompería ese flujo. La deuda de
-- RLS queda documentada en pwa/supabase/AGENTS.md.
--
-- Las funciones son SECURITY INVOKER: heredan RLS y solo leen. Además exigen
-- empresa o local para que no se pueda agregar "todo" sin ámbito.

-- 1. Índices para los filtros y agregados de las funciones.
CREATE INDEX IF NOT EXISTS idx_ventas_resumen_empresa_local_fecha
  ON public.ventas_resumen_diario (empresa_id, local_id, fecha);

CREATE INDEX IF NOT EXISTS idx_ventas_hora_empresa_local_fecha_hora
  ON public.ventas_por_hora (empresa_id, local_id, fecha, hora);

CREATE INDEX IF NOT EXISTS idx_empresas_owner_user_id
  ON public.empresas (owner_user_id);

-- 2. Cobertura histórica: hasta dónde llegan las ventas diarias y las horarias.
CREATE OR REPLACE FUNCTION public.analytics_coverage(
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL
)
RETURNS TABLE (
  primera_venta date,
  ultima_venta date,
  primera_hora date,
  ultima_hora date,
  dias_diarios integer,
  dias_horarios integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT MIN(v.fecha) FROM public.ventas_resumen_diario v
      WHERE (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR v.local_id = p_local_id)) AS primera_venta,
    (SELECT MAX(v.fecha) FROM public.ventas_resumen_diario v
      WHERE (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR v.local_id = p_local_id)) AS ultima_venta,
    (SELECT MIN(h.fecha) FROM public.ventas_por_hora h
      WHERE (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR h.local_id = p_local_id)) AS primera_hora,
    (SELECT MAX(h.fecha) FROM public.ventas_por_hora h
      WHERE (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR h.local_id = p_local_id)) AS ultima_hora,
    (SELECT COUNT(DISTINCT v.fecha)::integer FROM public.ventas_resumen_diario v
      WHERE (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR v.local_id = p_local_id)) AS dias_diarios,
    (SELECT COUNT(DISTINCT h.fecha)::integer FROM public.ventas_por_hora h
      WHERE (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
        AND (p_local_id IS NULL OR h.local_id = p_local_id)) AS dias_horarios;
END;
$$;

-- 3. Totales, días con actividad y mejores/peores días del periodo.
CREATE OR REPLACE FUNCTION public.analytics_period_totals(
  p_desde date,
  p_hasta date,
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL
)
RETURNS TABLE (
  facturado numeric,
  tickets bigint,
  efectivo numeric,
  tarjeta numeric,
  pendiente numeric,
  dias_con_datos integer,
  dias_horarios integer,
  primera_fecha date,
  ultima_fecha date,
  mejor_fecha date,
  mejor_facturado numeric,
  peor_fecha date,
  peor_facturado numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  IF p_empresa_id IS NOT NULL AND p_local_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locales l
    WHERE l.id = p_local_id AND l.empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'analytics: el local no pertenece a la empresa';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT v.fecha, v.total_facturado, v.num_tickets,
           v.total_efectivo, v.total_tarjeta, v.total_pendiente
    FROM public.ventas_resumen_diario v
    WHERE v.fecha BETWEEN p_desde AND p_hasta
      AND (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
      AND (p_local_id IS NULL OR v.local_id = p_local_id)
  ),
  daily AS (
    SELECT b.fecha,
           SUM(b.total_facturado) AS facturado,
           SUM(b.num_tickets)::bigint AS tickets
    FROM base b
    GROUP BY b.fecha
  ),
  totals AS (
    SELECT
      COALESCE(SUM(b.total_facturado), 0)::numeric(14,2) AS facturado,
      COALESCE(SUM(b.num_tickets), 0)::bigint AS tickets,
      COALESCE(SUM(b.total_efectivo), 0)::numeric(14,2) AS efectivo,
      COALESCE(SUM(b.total_tarjeta), 0)::numeric(14,2) AS tarjeta,
      COALESCE(SUM(b.total_pendiente), 0)::numeric(14,2) AS pendiente,
      COUNT(DISTINCT b.fecha)::integer AS dias_con_datos,
      MIN(b.fecha) AS primera_fecha,
      MAX(b.fecha) AS ultima_fecha
    FROM base b
  ),
  hourly AS (
    SELECT COUNT(DISTINCT h.fecha)::integer AS dias_horarios
    FROM public.ventas_por_hora h
    WHERE h.fecha BETWEEN p_desde AND p_hasta
      AND (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
      AND (p_local_id IS NULL OR h.local_id = p_local_id)
  ),
  extremes AS (
    SELECT
      (SELECT d.fecha FROM daily d WHERE d.tickets > 0
        ORDER BY d.facturado DESC, d.fecha LIMIT 1) AS mejor_fecha,
      (SELECT d.facturado FROM daily d WHERE d.tickets > 0
        ORDER BY d.facturado DESC, d.fecha LIMIT 1) AS mejor_facturado,
      (SELECT d.fecha FROM daily d WHERE d.tickets > 0
        ORDER BY d.facturado ASC, d.fecha LIMIT 1) AS peor_fecha,
      (SELECT d.facturado FROM daily d WHERE d.tickets > 0
        ORDER BY d.facturado ASC, d.fecha LIMIT 1) AS peor_facturado
  )
  SELECT t.facturado, t.tickets, t.efectivo, t.tarjeta, t.pendiente,
         t.dias_con_datos, h.dias_horarios, t.primera_fecha, t.ultima_fecha,
         e.mejor_fecha, e.mejor_facturado, e.peor_fecha, e.peor_facturado
  FROM totals t
  CROSS JOIN hourly h
  CROSS JOIN extremes e;
END;
$$;

-- 4. Serie temporal agrupada por día, semana, mes o año.
CREATE OR REPLACE FUNCTION public.analytics_timeseries(
  p_desde date,
  p_hasta date,
  p_bucket text DEFAULT 'day',
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL
)
RETURNS TABLE (
  bucket_start date,
  facturado numeric,
  tickets bigint,
  efectivo numeric,
  tarjeta numeric,
  pendiente numeric,
  dias_con_datos integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_bucket NOT IN ('day', 'week', 'month', 'year') THEN
    RAISE EXCEPTION 'analytics: bucket inválido: %', p_bucket;
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT v.fecha, v.total_facturado, v.num_tickets,
           v.total_efectivo, v.total_tarjeta, v.total_pendiente
    FROM public.ventas_resumen_diario v
    WHERE v.fecha BETWEEN p_desde AND p_hasta
      AND (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
      AND (p_local_id IS NULL OR v.local_id = p_local_id)
  ),
  bucketed AS (
    SELECT
      CASE p_bucket
        WHEN 'week' THEN date_trunc('week', b.fecha)::date
        WHEN 'month' THEN date_trunc('month', b.fecha)::date
        WHEN 'year' THEN date_trunc('year', b.fecha)::date
        ELSE b.fecha
      END AS bucket_start,
      b.fecha,
      b.total_facturado,
      b.num_tickets,
      b.total_efectivo,
      b.total_tarjeta,
      b.total_pendiente
    FROM base b
  )
  SELECT
    bb.bucket_start,
    COALESCE(SUM(bb.total_facturado), 0)::numeric(14,2) AS facturado,
    COALESCE(SUM(bb.num_tickets), 0)::bigint AS tickets,
    COALESCE(SUM(bb.total_efectivo), 0)::numeric(14,2) AS efectivo,
    COALESCE(SUM(bb.total_tarjeta), 0)::numeric(14,2) AS tarjeta,
    COALESCE(SUM(bb.total_pendiente), 0)::numeric(14,2) AS pendiente,
    COUNT(DISTINCT bb.fecha)::integer AS dias_con_datos
  FROM bucketed bb
  GROUP BY bb.bucket_start
  ORDER BY bb.bucket_start;
END;
$$;

-- 5. Página de días para la tabla (evita traer todo el histórico al navegador).
CREATE OR REPLACE FUNCTION public.analytics_daily_page(
  p_desde date,
  p_hasta date,
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  fecha date,
  facturado numeric,
  tickets bigint,
  efectivo numeric,
  tarjeta numeric,
  pendiente numeric,
  ultima_actualizacion timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  SELECT
    v.fecha,
    COALESCE(SUM(v.total_facturado), 0)::numeric(14,2) AS facturado,
    COALESCE(SUM(v.num_tickets), 0)::bigint AS tickets,
    COALESCE(SUM(v.total_efectivo), 0)::numeric(14,2) AS efectivo,
    COALESCE(SUM(v.total_tarjeta), 0)::numeric(14,2) AS tarjeta,
    COALESCE(SUM(v.total_pendiente), 0)::numeric(14,2) AS pendiente,
    MAX(v.ultima_actualizacion) AS ultima_actualizacion,
    COUNT(*) OVER () AS total_count
  FROM public.ventas_resumen_diario v
  WHERE v.fecha BETWEEN p_desde AND p_hasta
    AND (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
    AND (p_local_id IS NULL OR v.local_id = p_local_id)
  GROUP BY v.fecha
  ORDER BY v.fecha DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 400)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 6. Perfil por día de la semana y hora.
CREATE OR REPLACE FUNCTION public.analytics_hourly_profile(
  p_desde date,
  p_hasta date,
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL
)
RETURNS TABLE (
  dia_semana integer,
  hora integer,
  facturado numeric,
  tickets bigint,
  dias_con_datos integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(ISODOW FROM h.fecha)::integer AS dia_semana,
    h.hora,
    COALESCE(SUM(h.total_facturado), 0)::numeric(14,2) AS facturado,
    COALESCE(SUM(h.num_tickets), 0)::bigint AS tickets,
    COUNT(DISTINCT h.fecha)::integer AS dias_con_datos
  FROM public.ventas_por_hora h
  WHERE h.fecha BETWEEN p_desde AND p_hasta
    AND (p_empresa_id IS NULL OR h.empresa_id = p_empresa_id)
    AND (p_local_id IS NULL OR h.local_id = p_local_id)
  GROUP BY EXTRACT(ISODOW FROM h.fecha), h.hora
  ORDER BY 1, 2;
END;
$$;

-- 7. Totales por día de la semana (para comparar semanas y meses).
CREATE OR REPLACE FUNCTION public.analytics_weekday_totals(
  p_desde date,
  p_hasta date,
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL
)
RETURNS TABLE (
  dia_semana integer,
  facturado numeric,
  tickets bigint,
  dias_con_datos integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(ISODOW FROM v.fecha)::integer AS dia_semana,
    COALESCE(SUM(v.total_facturado), 0)::numeric(14,2) AS facturado,
    COALESCE(SUM(v.num_tickets), 0)::bigint AS tickets,
    COUNT(DISTINCT v.fecha)::integer AS dias_con_datos
  FROM public.ventas_resumen_diario v
  WHERE v.fecha BETWEEN p_desde AND p_hasta
    AND (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
    AND (p_local_id IS NULL OR v.local_id = p_local_id)
  GROUP BY EXTRACT(ISODOW FROM v.fecha)
  ORDER BY 1;
END;
$$;

-- 8. Mejores y peores días con actividad.
CREATE OR REPLACE FUNCTION public.analytics_top_days(
  p_desde date,
  p_hasta date,
  p_empresa_id uuid DEFAULT NULL,
  p_local_id text DEFAULT NULL,
  p_order text DEFAULT 'best',
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  fecha date,
  facturado numeric,
  tickets bigint,
  ticket_medio numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
    RAISE EXCEPTION 'analytics: rango de fechas inválido';
  END IF;

  IF p_empresa_id IS NULL AND p_local_id IS NULL THEN
    RAISE EXCEPTION 'analytics: se requiere empresa o local';
  END IF;

  IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = p_empresa_id AND e.owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'analytics: empresa no autorizada';
  END IF;

  RETURN QUERY
  WITH daily AS (
    SELECT v.fecha,
           SUM(v.total_facturado)::numeric(14,2) AS facturado,
           SUM(v.num_tickets)::bigint AS tickets
    FROM public.ventas_resumen_diario v
    WHERE v.fecha BETWEEN p_desde AND p_hasta
      AND (p_empresa_id IS NULL OR v.empresa_id = p_empresa_id)
      AND (p_local_id IS NULL OR v.local_id = p_local_id)
    GROUP BY v.fecha
    HAVING SUM(v.num_tickets) > 0
  )
  SELECT
    d.fecha,
    d.facturado,
    d.tickets,
    CASE WHEN d.tickets > 0 THEN ROUND(d.facturado / d.tickets, 2) ELSE 0 END
  FROM daily d
  ORDER BY
    CASE WHEN p_order = 'worst' THEN d.facturado END ASC NULLS LAST,
    CASE WHEN p_order <> 'worst' THEN d.facturado END DESC NULLS LAST,
    d.fecha
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
END;
$$;

-- 9. Permisos explícitos. El panel con PIN consulta sin sesión de Supabase,
--    igual que el dashboard actual; las funciones solo leen y exigen ámbito.
REVOKE ALL ON FUNCTION public.analytics_coverage(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_period_totals(date, date, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_timeseries(date, date, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_daily_page(date, date, uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_hourly_profile(date, date, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_weekday_totals(date, date, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_top_days(date, date, uuid, text, text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.analytics_coverage(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_period_totals(date, date, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_timeseries(date, date, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_daily_page(date, date, uuid, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_hourly_profile(date, date, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_weekday_totals(date, date, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_days(date, date, uuid, text, text, integer) TO anon, authenticated;
