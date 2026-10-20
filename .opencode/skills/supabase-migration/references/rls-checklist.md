# Checklist de RLS y seguridad de datos

Referencia de `supabase-migration`. Aplícala antes de dar una migración por
buena.

---

## 1. La pregunta que siempre va primero

> **¿Qué puede hacer un usuario NO autenticado con la anon key?**

La `VITE_SUPABASE_ANON_KEY` va incrustada en `pwa/dist/assets/index-*.js`. No es
un secreto. Cualquiera que abra el panel la tiene. Si una política permite algo
sin `auth.uid()`, eso es público para internet.

No es hipotético: `20260908_enable_rls_policies.sql:98-107` tiene exactamente eso
en las dos tablas de ventas.

---

## 2. Patrones de política correctos

### Lectura y escritura por propietario del tenant

```sql
ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<tabla>_owner_full_access" ON public.<tabla>
  FOR ALL
  USING (
    empresa_id IN (
      SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()
    )
  );
```

Aplica a: `locales`, `empleados`, `gastos`, `ventas_resumen_diario`,
`ventas_por_hora`, `fichajes`.

### Solo lectura

Añade un `WITH CHECK (false)` implícito separando `USING` (lectura) de la
escritura. Para lectura pura:

```sql
CREATE POLICY "<tabla>_owner_read" ON public.<tabla>
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()
    )
  );
```

### Escritura desde el agente Python

⚠ **Este es el caso difícil.** El agente sube con la misma anon key, y su
`empresa_id` lo rellena un trigger (`auto_assign_empresa_id`) a partir de una
subconsulta que hoy no discrimina por usuario.

La solución correcta es una `service_role` key, que **nunca** va en el bundle.
Opcionalmente, una Edge Function de Supabase que el agente llame en lugar de
escribir directo a PostgREST. Ninguna de las dos está montada hoy.

**No lo resuelvas con `USING (true)`.** Es lo que hay ahora y es un agujero
público de escritura sobre los datos de ventas de todos los clientes.

### Ficha de un empleado en una tablet compartida

`fichajes` necesita que un empleado sin sesión registre su entrada. Hoy se
resuelve con `WITH CHECK (true)`, es decir, cualquiera inserta fichajes en
cualquier local.

Alternativa defendible: que el cliente valide un **token opaco de una sola
escritura** emitido por una Edge Function que conoce el `local_id` y el PIN del
empleado, de un solo uso y con caducidad corta. El PIN no viaja ni se compara en
el cliente.

---

## 3. Prohibiciones absolutas

```sql
-- ❌ NUNCA
USING (true)                      -- tabla pública de lectura y escritura
WITH CHECK (true)                 -- cualquiera inserta lo que quiera
USING (... OR auth.uid() IS NULL) -- "dejo pasar al anónimo" disfrazado de política
IF input_pin = '1234' THEN ...    -- backdoor de credencial
SECURITY DEFINER                  -- ...sin SET search_path
```

Cada una de estas aparece hoy en el repositorio. No añadas otra.

---

## 4. `SECURITY DEFINER` bien hecho

```sql
CREATE OR REPLACE FUNCTION public.<fn>(<args>)
RETURNS <tipo>
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp   -- ← obligatorio
AS $$
BEGIN
    ...
END;
$$;

REVOKE ALL ON FUNCTION public.<fn>(<tipos de args>) FROM anon;
GRANT EXECUTE ON FUNCTION public.<fn>(<tipos de args>) TO authenticated;
```

- Sin `SET search_path`, un atacante con permiso `CREATE` puede ejecutar código
  arbitrario en el contexto de la función.
- Sin `REVOKE ... FROM anon`, cualquiera que tenga la anon key puede llamarla.

---

## 5. Por qué `EXCEPTION WHEN OTHERS THEN NULL` está prohibido

Hay dos bloques así en `20260908_enable_rls_policies.sql:31` y `:43`:

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...') THEN
        ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;   -- ❌ se traga cualquier error
END $$;
```

Escenario real: la tabla ya tiene datos duplicados, el `ADD CONSTRAINT` falla,
el bloque se traga la excepción, **la migración termina con éxito**, el
constraint no existe, y desde ese momento el upsert del agente devuelve `409`
en **todos** los lotes. El agente loguea un error por lote y sigue. Nadie sabe
por qué el dashboard lleva semanas sin ventas.

Si necesitas tolerancia al error, captura la excepción concreta y dila:

```sql
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'La tabla ya existe, se omite';
    WHEN others THEN
        RAISE EXCEPTION 'Fallo creando <constraint> en <tabla>: %', SQLERRM;
```

---

## 6. Checklist de salida

- [ ] ¿Tabla nueva? → RLS habilitado **y** política creada en la misma migración
- [ ] ¿Hay algún `true` literal en `USING` o `WITH CHECK`? → **No debe haberlo**
- [ ] ¿Hay algún `auth.uid() IS NULL`? → **No debe haberlo**
- [ ] ¿La política pasa por `empresa_id`?
- [ ] ¿Tabla de tenant sin `empresa_id`? → añadela con `REFERENCES public.empresas(id)`
- [ ] ¿El trigger `auto_assign_empresa_id` cubre esta tabla? → si no, añádelo
- [ ] ¿`SECURITY DEFINER`? → `SET search_path` + `REVOKE ... FROM anon`
- [ ] ¿Algún PIN o credencial en el SQL? → **No debe haberlo**
- [ ] ¿Importe? → `NUMERIC(10,2)`
- [ ] ¿`WHEN OTHERS THEN NULL`? → **No debe haberlo**
- [ ] ¿Cambia un `UNIQUE` que consume `sync_agent.py`? → actualiza `on_conflict`
- [ ] ¿Cambia `verify_admin_pin` o cualquier RPC? → revisa también
      `seed_demo_data.sql`, que tiene definiciones duplicadas
