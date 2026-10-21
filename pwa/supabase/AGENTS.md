# AGENTS.md — pwa/supabase/ (esquema)

Instrucciones específicas del esquema de base de datos. Complementan el
`AGENTS.md` de la raíz (§6.2 y §6.3 son vinculantes aquí).

---

## 1. Estructura

```
pwa/supabase/
├── migrations/
│   ├── 20260904_auto_empresa_id_trigger.sql      (73 líneas)
│   ├── 20260904_disable_rls_temp.sql             (24)
│   ├── 20260904_multi_tenant_rls.sql             (177)
│   ├── 20260908_enable_rls_policies.sql           (123)
│   ├── 20260908_fix_missing_columns.sql          (28)
│   └── 20260908_move_pin_to_empresa.sql          (57)
└── seed_demo_data.sql                            (366)
```

Orden de aplicación: **nombre de fichero ascendente**, que es como se aplicaron.
Las migraciones son concatenables, no idempotentes por sí solas.

> ⚠ `.gitignore` raíz línea 4 contiene `*.sql`. **Ninguna de estas migraciones
> está versionada.** Trátalo como una limitación pendiente, no como que el
> esquema sea opcional.

---

## 2. Reglas para escribir migraciones

1. **Siempre migración nueva.** Nunca edites una ya aplicada: las instancias
   sincronizadas no la reejecutan y la divergencia es silenciosa.
2. **Nombre**: `YYYYMMDD_descripcion_corta_en_snake.sql`.
3. **Una migración = un cambio conceptual.** Columnas de varias tablas que
   comparten el mismo motivo, van juntas.
4. **Idempotencia**: usa `ADD COLUMN IF NOT EXISTS`, `DROP ... IF EXISTS` y
   `CREATE ... IF NOT EXISTS`. Una migración debe poder correr dos veces sin
   romper.
5. **⚠ Nunca `EXCEPTION WHEN OTHERS THEN NULL`** en un bloque `DO $$`.

   `20260908_enable_rls_policies.sql:31` y `:43` lo hacen. Efecto: si el
   constraint falla, la migración **termina con éxito sin crearlo**, y el
   upsert del agente empieza a fallar contra todos los lotes sin que nada lo
   señale. Si necesitas tolerancia a errores, captura la excepción concreta y
   RAISE con un mensaje.
6. **Comenta el porqué**, no el qué. `sql` ya se lee solo.

---

## 3. Seguridad de datos — RLS

### Estado actual

| Tabla | RLS | Problema |
|---|---|---|
| `empresas` | ON | Correcto: `owner_user_id = auth.uid()` |
| `locales` | ON | `:80` termina en `OR auth.uid() IS NULL` → **lectura anónima de todos los locales**, incluido `ip_publica` |
| `empleados` | ON | Correcto por `empresa_id` |
| `gastos` | ON | Correcto por `empresa_id` |
| `ventas_resumen_diario` | ON | ❌ `FOR ALL USING (true) WITH CHECK (true)` (`:98-107`) |
| `ventas_por_hora` | ON | ❌ `FOR ALL USING (true) WITH CHECK (true)` (`:104-110`) |
| `fichajes` | ON | `WITH CHECK (true)` en el INSERT (`:121`) |

`20260904_disable_rls_temp.sql` desactivó RLS en 8 tablas. La migración del 08
lo revierte, pero el fichero sigue en el repo y se lee como si fuera vigente.

> ⚠ **Deuda pendiente y por qué no se cerró en `20261020_analytics_readonly.sql`.**
> El panel se usa también con PIN de admin y **sin sesión de Supabase**
> (`AdminPinLock` → `verify_admin_pin`, que es `SECURITY DEFINER`). En ese modo
> las queries salen como `anon`. Pasar las ventas a lectura solo-dueño
> (`empresa_id IN (SELECT id FROM empresas WHERE owner_user_id = auth.uid())`)
> dejaría el dashboard con PIN con datos vacíos. Cerrar RLS exige antes decidir
> el modelo de acceso: sesión real para el kiosko, o RPC con verificación de PIN
> por petición. La alternativa actual —seguir como `anon`— mantiene la lectura
> cross-tenant que ya existía; el módulo de estadísticas no la amplía, pero
> tampoco la resuelve.

### Reglas

- **Prohibido `USING (true)` y `WITH CHECK (true)`** en cualquier política de
  producción. La anon key del frontend está en el bundle: con esas políticas,
  cualquiera con DevTools lee y escribe las ventas de todos los tenants.
- **Prohibido el atajo `OR auth.uid() IS NULL`** para "dejar pasar al caso
  anónimo". Eso es una política pública disfrazada.
- Toda política de una tabla de tenant filtra por `empresa_id`:

  ```sql
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE owner_user_id = auth.uid())
  )
  ```

- **Prohibidos backdoors de credencial en SQL.** `seed_demo_data.sql:82-84`
  tiene `IF input_pin = '1234' THEN RETURN true; END IF;`. Si necesitas un
  camino de admin, va con una sesión de Supabase Auth real, no con un PIN
  hardcodeado en la función.

### Para cada tabla nueva, responde antes de escribir la política

1. ¿Quién puede leerla? ¿Quién puede escribirla?
2. ¿Qué puede hacer **un usuario no autenticado** con la anon key?
3. ¿Es una tabla de un tenant? Entonces `empresa_id` es obligatorio, y con
   trigger que lo rellene (`auto_assign_empresa_id` ya existe).

---

## 4. RPC y funciones

| Función | Tipo | Nota |
|---|---|---|
| `auto_assign_empresa_id()` | Trigger | Rellena `empresa_id` en INSERT |
| `auto_assign_empresa_fichajes()` | Trigger | Ídem para `fichajes` |
| `vincular_terminal()` | `SECURITY DEFINER` | Activación de terminal por QR. ⚠ Sin uso en el frontend hoy |
| `verify_admin_pin()` | `SECURITY DEFINER` | Validación del PIN admin. **Duplicada** en `seed_demo_data.sql:54` |
| `analytics_coverage()` | `SECURITY INVOKER` | Cobertura histórica diaria y horaria |
| `analytics_period_totals()` | `SECURITY INVOKER` | Totales, días con actividad y mejor/peor día |
| `analytics_timeseries()` | `SECURITY INVOKER` | Serie agrupada por día/semana/mes/año |
| `analytics_daily_page()` | `SECURITY INVOKER` | Página de días para la tabla |
| `analytics_hourly_profile()` | `SECURITY INVOKER` | Perfil por día de la semana y hora |
| `analytics_weekday_totals()` | `SECURITY INVOKER` | Totales por día de la semana |
| `analytics_top_days()` | `SECURITY INVOKER` | Mejores/peores días con actividad |

Las funciones `analytics_*` son de **solo lectura** y `SECURITY INVOKER` (heredan
RLS; no la saltan). Exigen `p_empresa_id` **o** `p_local_id` y, si hay `auth.uid()`,
verifican que la empresa pertenece al usuario. No cambian tablas, columnas ni el
payload del agente. El desglose horario excluye tickets pendientes, así que la
suma por hora puede no cuadrar con el total diario cuando hay pendiente.

Reglas para cualquier función nueva:

- **`SECURITY DEFINER` implica fijar `search_path`**, o un usuario con CREATE
  puede secuestrar la función. Ninguna de las actuales lo hace.
- **Quita el acceso a `anon` por defecto** en funciones que validan credenciales:

  ```sql
  REVOKE ALL ON FUNCTION public.verify_admin_pin(text) FROM anon;
  GRANT EXECUTE ON FUNCTION public.verify_admin_pin(text) TO authenticated;
  ```

- **No dupliques la función.** `verify_admin_pin` está en dos ficheros y se
  contradicen: una lo define con `locales.pin_admin` y otra con
  `empresas.pin_admin`. Gana la última aplicada, que depende del orden.
- **`verify_admin_pin` no debe validar el PIN en el servidor y luego dejar que
  el cliente acepte un valor por defecto.** El frontend hoy tiene un fallback
  `1234` en `AdminPinLock.tsx:45` que se aplica cuando la RPC falla por red o
  permisos. Arreglar el SQL sin arreglar eso no arregla nada.

---

## 5. Contrato con el agente Python

El upsert del agente depende de estos constraints. Si los tocas, actualiza
también `sync_agent.py` (§6.3 del `AGENTS.md` raíz).

| Tabla | Constraint | `on_conflict` en Python |
|---|---|---|
| `ventas_resumen_diario` | `UNIQUE (local_id, fecha, turno)` | `local_id,fecha,turno` |
| `ventas_por_hora` | `UNIQUE (local_id, fecha, hora)` | `local_id,fecha,hora` |
| `productos` | PK `codigo` | `codigo` |
| `locales` | PK `id` | `id` |

Los importes son `NUMERIC(10,2)`. El agente los manda desde Python como
`Decimal`/`float`; mantén la escala de 2 decimales.

---

## 6. Tablas

| Tabla | Contenido | Notas |
|---|---|---|
| `empresas` | Tenant. `owner_user_id`, `pin_admin` | Raíz del aislamiento |
| `locales` | Restaurantes. `ip_publica`, `direccion`, `activo` | `ip_publica` la escribe el agente vía ipify |
| `empleados` | Personal. `coste_hora`, `pin_empleado`, `activo` | `pin_empleado` default `'0000'` = sin PIN |
| `fichajes` | Entradas/salidas. `tipo`, `fecha_hora` | ⚠ `pin_empleado` se descarga al navegador en texto plano |
| `gastos` | Gastos e ingresos. `tipo`, `categoria`, `proveedor` | `categoria` tiene constraint CHECK |
| `ventas_resumen_diario` | Agregado por día y turno | `total_pendiente` solo lo rellena el sync diario |
| `ventas_por_hora` | Agregado por hora | |
| `productos` | Catálogo | Lo carga `sync_productos.py` |

⚠ **Asimetría conocida**: `extract_metrics` (sync diario) genera
`total_pendiente` y acepta estados `C/c/P`; `extract_all` (histórico) no genera
ese campo y solo acepta `C/c`. Como PostgREST usa
`Prefer: resolution=merge-duplicates`, una fila creada por el sync diario y luego
sobrescrita por el histórico conserva un `total_pendiente` obsoleto. Si tocas
esto, sincroniza ambos extractores.

---

## 7. Checklist antes de dar una migración por buena

- [ ] ¿Es un fichero **nuevo**, no una edición de uno aplicado?
- [ ] ¿El nombre sigue `YYYYMMDD_descripcion.sql` y ordena después de las
      existentes?
- [ ] ¿Es idempotente (`IF NOT EXISTS` / `IF EXISTS`)?
- [ ] ¿Hay algún `EXCEPTION WHEN OTHERS THEN NULL`? → **No debe haberlo.**
- [ ] ¿La tabla tiene RLS activo y política explícita?
- [ ] ¿Alguna política dice `USING (true)`, `WITH CHECK (true)` o
      `auth.uid() IS NULL`? → **Prohibido.**
- [ ] ¿La política filtra por `empresa_id`?
- [ ] ¿Qué puede hacer un usuario **no autenticado** con la anon key?
- [ ] ¿Hay `SECURITY DEFINER`? → entonces `SET search_path` y `REVOKE ... FROM anon`.
- [ ] ¿Hay algún PIN o credencial hardcodeado en el SQL? → **No debe haberlo.**
- [ ] ¿He tocado una clave de upsert que consume `sync_agent.py`?
- [ ] ¿El frontend necesita la columna nueva en `pwa/src/types.ts`?
- [ ] ¿He arrastrado una definición duplicada desde `seed_demo_data.sql`?
