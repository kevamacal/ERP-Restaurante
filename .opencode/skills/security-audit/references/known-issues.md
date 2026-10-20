# Incidencias de seguridad conocidas

Inventario con ubicaciones exactas. **H1 y H2 ya están arreglados en el código;
el resto sigue abierto.** Sirve para no repetir los hallazgos y para priorizar.

Actualizado: 2026-10-20 · Repo `github.com/kevamacal/ERP-Restaurante` (público)

---

## Orden de arreglo sugerido

### Paso 1 · Rotar claves (independiente del resto, hazlo hoy)

| # | Qué rotar | Dónde está filtrado | Por qué |
|---|---|---|---|
| 1 | **Clave de Google Gemini** (`AQ.Ab8R…`) | `pwa/.env:3` → bundle antiguo desplegado | Estuvo sirviéndose en producción. Cualquiera la tiene. Pendiente de revocar en Google AI Studio. |

La `sb_publishable_` de Supabase **no hay que rotarla**: es pública por diseño y
no da privilegios. El riesgo real es H3 (RLS abierto), no la clave.

Rotar no basta: revoca la clave antigua en el panel del proveedor. Borrarla del
fichero sin revocarla deja la puerta abierta.

### Paso 2 · Cerrar la escritura pública (H3, H4, H9)

Sin esto, la anon key —que es pública por definición en un bundle— da lectura y
escritura sobre ventas de todos los tenants.

### Paso 3 · Arreglar el control de acceso (H5, H6, H7, H8)

Requiere rediseño del flujo de admin y de la validación del PIN de empleado.

### Paso 4 · Higiene (H10, H11, H12)

Sin urgencia, pero barato.

---

## Tabla resumen

| # | Severidad | Hallazgo | Ubicación | Arreglo |
|---|---|---|---|---|
| H1 | ✅ | Clave de Gemini en el bundle (arreglado; pendiente revocar la antigua) | Edge Function `analyze-invoice` | Revocar en Google AI Studio |
| H2 | ✅ | Credenciales Supabase en fichero versionado (arreglado) | `start_sync.bat` lee `.env` | Sin acción (clave publishable) |
| H3 | 🔴 | RLS `USING (true) WITH CHECK (true)` en ventas | `20260908_enable_rls_policies.sql:98-107`, `:104-110` | `service_role` key o Edge Function |
| H4 | 🔴 | Backdoor de PIN en SQL | `seed_demo_data.sql:82-84` | Eliminar la rama |
| H5 | 🔴 | Sesión admin concedida en el login, no tras el PIN | `App.tsx:38-40`, `OwnerLoginView.tsx:49,65,78`, `AuthModal.tsx:42,59,73` | Derivar de verificación real |
| H6 | 🟠 | PIN de fallback `1234` en cliente | `AdminPinLock.tsx:45,54`, `ClockInView.tsx:159` | Eliminar el fail-open |
| H7 | 🟠 | `pin_empleado` descargado al navegador | `ClockInView.tsx:51,123-141,199` | Validar en servidor |
| H8 | 🟠 | Validación de IP *fail-open* | `ClockInView.tsx:82,105,109` | Cerrar por defecto |
| H9 | 🟠 | RLS laxo en `locales` y `fichajes` | `20260908_enable_rls_policies.sql:80,121` | Políticas por tenant |
| H10 | 🟡 | `SECURITY DEFINER` sin `search_path` | `verify_admin_pin`, `vincular_terminal`, `auto_assign_empresa_id` | `SET search_path` |
| H11 | 🟡 | `.vercel/` versionado | `.vercel/repo.json` | Añadir a `.gitignore` |
| H12 | 🟡 | Credenciales demo visibles en la UI | `OwnerLoginView.tsx:44-46,145-146`, `AuthModal.tsx:37-39,131` | Quitar o marcar el entorno |

---

## Detalle de cada uno

### ✅ H1 · Clave de Gemini (arreglado; pendiente revocar)

Estado original: `pwa/.env:3` tenía `VITE_GEMINI_API_KEY=AQ.Ab8R…`. Vite
inlineaba toda variable `VITE_*` en el bundle y `geminiOCR.ts:43` pasaba la
clave en la query string.

**Estado actual (2026-10-20):** el OCR pasa por la Edge Function
`pwa/supabase/functions/analyze-invoice/`, que guarda `GEMINI_API_KEY` como
secreto de Supabase, valida el JWT, limita tipo/tamaño y usa timeout. El
frontend ya no conoce ninguna clave.

⚠ **Pendiente manual:** revocar `AQ.Ab8R…` en Google AI Studio. Ya no se
distribuye en builds nuevos, pero el bundle antiguo pudo quedar cacheado.

### ✅ H2 · Credenciales en `start_sync.bat` (arreglado)

Estado original: el `.bat` versionado llevaba `SUPABASE_URL` y
`SUPABASE_KEY=sb_publishable_…`. Era equivalente a la anon key, no
`service_role`, pero no debía estar en git.

**Estado actual:** el `.bat` solo comprueba que existe `.env` y ejecuta
`sync_agent.py`, que carga las credenciales del `.env` ignorado. No requiere
rotación ni `git filter-repo` porque la clave publishable es pública.

### H3 · Políticas RLS abiertas

```sql
-- 20260908_enable_rls_policies.sql:98-107
CREATE POLICY "Allow insert and update on sales summaries"
ON public.ventas_resumen_diario FOR ALL
USING (true) WITH CHECK (true);
```

El comentario de la migración dice "Aislamiento para lectura del dueño + permiso
de carga/upsert para sync_agent.py". La intención era dar permiso al agente; el
resultado es una tabla pública.

Las políticas de `empleados`, `gastos` y `empresas` están bien escritas, con
`empresa_id IN (SELECT id FROM empresas WHERE owner_user_id = auth.uid())`.
Las de ventas no.

### H4 · Backdoor de PIN

```sql
-- seed_demo_data.sql:82-84, dentro de verify_admin_pin (SECURITY DEFINER)
IF input_pin = '1234' THEN RETURN true; END IF;
```

Conocido y devuelve `true` sin consultar `empresas.pin_admin`.

Además `verify_admin_pin` está definida **dos veces** —en
`20260908_move_pin_to_empresa.sql:20` y en `seed_demo_data.sql:54`— con
firmas distintas. Gana la última aplicada según el orden.

### H5 · El flag de admin

```ts
// App.tsx:38-40
const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
  sessionStorage.getItem('admin_authenticated') === 'true'
);
```

Y ese flag se escribe en el login:
`OwnerLoginView.tsx:49,65,78` y `AuthModal.tsx:42,59,73`.

`AdminPinLock` existe, llama a `verify_admin_pin`, y el resultado **no decide**
el estado de admin. El PIN es decorativo.

### H6 · Fallback de PIN en cliente

```ts
// AdminPinLock.tsx:45,54
if (error) return inputPin === '1234';   // ❌ fail-open
```

Se aplica cuando la RPC falla por red, permisos o un error de Postgres. Es decir:
**si el servidor no responde, se acepta el PIN por defecto.**

### H7 · PINs en el cliente

`ClockInView.tsx:51` carga la tabla `empleados` completa con `.select('*')` y
compara `empleado.pin_empleado === inputPin` en el navegador (`:123-141`).

Cualquiera que abra la vista de fichaje y abra DevTools ve los PIN de todo el
personal del restaurante.

### H8 · Validación de IP

```ts
// ClockInView.tsx:105,109
setIsIpValid(true);   // cuando no se encuentra el local, o ipify falla
```

Ambos caminos que deberían denegar, conceden. Con `api.ipify.org` bloqueado en
el navegador, la validación pasa siempre.

### H9 · Resto de RLS

- `locales:80`: `... OR auth.uid() IS NULL` → cualquiera, sin sesión, lee todos
  los locales y sus `ip_publica`.
- `fichajes:121`: `WITH CHECK (true)` en el INSERT.
- `20260904_disable_rls_temp.sql` desactivó RLS en 8 tablas. La migración del 08
  lo revierte con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, pero el fichero
  temporal sigue en el repo y se lee como si fuera vigente.

### H10 · `SECURITY DEFINER` sin `search_path`

Ninguna de las funciones `SECURITY DEFINER` fija `search_path`. Sin eso, un
atacante con permiso `CREATE` en un esquema puede ejecutar código arbitrario en
el contexto de la función.

---

## Nota sobre el modelo

El flujo del empleado está diseñado sin control de acceso de servidor: el PIN
se compara en el cliente y los datos se descargan al navegador. Mientras sea
así, **cualquiera que tenga la anon key —es decir, cualquiera que abra la
web— puede saltarse el PIN entero**.

Añadir un campo más de PIN, o endurecer el existente en el cliente, no mejora
esto. La palanca real es mover la validación al servidor.

Cuando propongas un cambio en este área, explica primero el modelo de amenazas
actual en lugar de asumir que se puede endurecer de forma incremental.
