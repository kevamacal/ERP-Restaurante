---
name: Security Audit
description: Usar cuando el usuario pida una auditoría o revisión de seguridad, pregunte por la protección de los datos o el acceso, o antes de un cambio que toque autenticación, PIN, RLS, validación de IP o secretos. Cubre las dos capas de auth del proyecto, el aislamiento por RLS y los hallazgos abiertos.
metadata:
  opencode/autoinvoke: false
---

# Auditoría de seguridad

Revisión dirigida del modelo de autenticación, autorización y datos de
ERP-Restaurante.

---

## Cuándo aplicar esta skill

Carga esta skill **a mano** (`@security-audit`) cuando:

- El usuario pida una revisión de seguridad, auditoría, o pregunte por la
  seguridad de los datos o del acceso.
- Antes de un cambio que toque autenticación, PIN, RLS, validación de IP o
  manejo de secretos.
- Al planificar un despliegue con datos reales de clientes.

**No se carga sola.** Está marcada `autoinvoke: false` porque en el trabajo
diario del panel la seguridad aparece como contexto, no como tarea. Carga la
skill `verificar-despliegue` para el escaneo rápido de secretos; esta es la
revisión completa.

---

## Modelo de arquitectura

Dos audiencias con flujos distintos, y solo una tiene control de acceso real:

```
PROPIETARIO                          EMPLEADO (terminal compartida)
─────────────                        ──────────────────────────────────
Supabase Auth                        Sin sesión de usuario
  email/password                       → PIN de empleado
  Google OAuth                         → validación de IP
        │                                     │
        ▼                                     ▼
  session.user.id                      pin_empleado + local_id
        │                                     │
        └──► RLS filtra por empresa_id ◄───────┘
```

**Punto clave:** el flujo del empleado **no tiene control de acceso**. El PIN
se compara en el cliente y `locales.pin_admin` / `empleados.pin_empleado` se
descargan al navegador en texto plano. Quien tenga la anon key puede saltarse el
PIN entero.

---

## Inventario de hallazgos

Todos verificados. `🔴` = crítico, `🟠` = alto, `🟡` = medio.

### ✅ H1 — Clave de Gemini en el bundle (arreglado, requiere revocación manual)

Estado original: `pwa/.env:3` contenía una clave real de Google Gemini. Vite la
inlineaba en build time y `geminiOCR.ts:43` la mandaba en la query string.

**Estado actual:** el OCR pasa por la Edge Function
`pwa/supabase/functions/analyze-invoice/`, que lee `GEMINI_API_KEY` como secreto
de Supabase y valida el JWT del usuario. El frontend ya no conoce ninguna clave
ni usa `VITE_GEMINI_API_KEY`. La clave sale en cabecera `x-goog-api-key`, no en
la URL.

⚠ **Acción pendiente del operador:** revocar en Google AI Studio la clave
antigua (`AQ.Ab8R...`) porque estuvo expuesta en el bundle desplegado. Borrarla
del `.env` no la invalida.

### ✅ H2 — Credenciales Supabase en `start_sync.bat` (arreglado)

Estado original: `start_sync.bat:3-4` contenía `SUPABASE_URL` y `SUPABASE_KEY`
en un fichero versionado.

**Estado actual:** el `.bat` ya no lleva credenciales; solo comprueba que existe
`.env` y arranca `sync_agent.py`, que carga `SUPABASE_URL` / `SUPABASE_KEY` del
`.env` ignorado por git. La clave filtrada era `sb_publishable_...`, que es
pública por diseño (no da privilegios), así que no requiere rotación; si alguna
vez se hubiera usado una `service_role`, sí habría que rotarla y limpiar el
historial.

### 🔴 H3 — RLS abierto en las tablas de ventas

`20260908_enable_rls_policies.sql:98-107`:

```sql
CREATE POLICY "Allow insert and update on sales summaries"
ON public.ventas_resumen_diario FOR ALL
USING (true) WITH CHECK (true);
```

Idéntico en `ventas_por_hora:104-110`. Con la anon key (que es pública, ver
H1), cualquiera **lee y escribe las ventas de todos los tenants**.

**Arreglo:** usar una `service_role` key en el agente Python —que nunca debe ir
en el bundle— o una Edge Function intermediaria. Si la policy debe permitir al
agente, no puede ser `USING (true)`.

### 🔴 H4 — Backdoor de PIN en SQL

`seed_demo_data.sql:82-84`:

```sql
IF input_pin = '1234' THEN RETURN true; END IF;
```

Dentro de `verify_admin_pin`, que es `SECURITY DEFINER`. Un PIN conocido
concede estado de administrador **en el servidor**, sin consultar la tabla.

### 🔴 H5 — La sesión admin se concede en el login, no tras el PIN

`App.tsx:38-40` lee `sessionStorage.getItem("admin_authenticated")` al montar.
Ese flag se escribe en el **login** (`OwnerLoginView.tsx:49,65,78` y
`AuthModal.tsx:42,59,73`), no después de validar el PIN.

**Consecuencia:** cualquier login de propietario concede acceso admin completo
sin pasar por `AdminPinLock`. Y `sessionStorage` es editable desde DevTools.

**Arreglo:** el estado de admin se deriva de una verificación real contra
`verify_admin_pin`, nunca de un flag en almacenamiento de cliente.

### 🟠 H6 — PIN de fallback en el cliente

`AdminPinLock.tsx:45,54` acepta `1234` cuando la RPC falla por red o permisos.
`ClockInView.tsx:159` hace lo mismo con `locales.pin_admin`.

Un *fail-open* en autenticación no es un fallback: es una puerta.
`ClockInView.tsx:123,199,276` además trata `pin_empleado == '0000'` como "sin
protección", que es el default de la columna.

### 🟠 H7 — PINs de empleados descargados al navegador

`ClockInView.tsx:51` hace `.select('*')` de `empleados` y compara el PIN en
cliente (`:123-141`, `:199`). Los `pin_empleado` de todo el personal llegan en
texto plano al navegador de cualquiera que abra la vista de fichaje.

**Arreglo:** validar en el servidor mediante una RPC o Edge Function que reciba
el PIN y el `empleado_id`, y devuelva solo un booleano.

### 🟠 H8 — Validación de IP *fail-open*

`ClockInView.tsx:105` (local no encontrado) y `:109` (ipify caído) →
`setIsIpValid(true)`. Bloquear `api.ipify.org` desde el navegador **desactiva la
"protección" por IP**.

Además la petición a ipify (`:82`) no tiene `timeout` ni `AbortController`.

### 🟠 H9 — RLS laxo en el resto de tablas

- `locales`: `:80` termina en `OR auth.uid() IS NULL` → lectura anónima de todos
  los locales, incluido `ip_publica`.
- `fichajes`: `:121` `WITH CHECK (true)` en el INSERT → cualquiera inserta
  fichajes en cualquier local.
- `20260904_disable_rls_temp.sql` desactivó RLS en 8 tablas. La migración del 08
  lo revierte, pero el fichero sigue ahí y se lee como vigente.

### 🟡 H10 — `SECURITY DEFINER` sin `search_path`

`verify_admin_pin`, `vincular_terminal` y `auto_assign_empresa_id` son
`SECURITY DEFINER` sin `SET search_path`. Un atacante con permiso `CREATE` puede
secuestrar la ejecución.

### ✅ H11 — `.vercel/` versionado (arreglado)

`.vercel/repo.json` contenía `projectId` y `orgId`. Ya no está versionado:
`.gitignore` raíz incluye `.vercel/` y `git ls-files` no lo devuelve. No es una
credencial, pero no aporta nada al repo.

### 🟡 H12 — Credenciales de la cuenta demo en la UI

`OwnerLoginView.tsx:44-46,145-146` y `AuthModal.tsx:37-39,131` muestran el
usuario y la contraseña de la cuenta de demostración en pantalla. Si la base de
datos de producción contiene esa cuenta, es una puerta abierta.

---

## Procedimiento de auditoría

```bash
# 1. Secretos
git ls-files | xargs grep -nI -E 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_publishable_[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}' 2>/dev/null
grep -rnE 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}' pwa/dist/ 2>/dev/null

# 2. RLS
grep -n "USING (true)\|WITH CHECK (true)\|auth.uid() IS NULL" pwa/supabase/migrations/*.sql pwa/supabase/seed_demo_data.sql

# 3. Credenciales hardcodeadas en SQL
grep -n "= '[0-9]\{4\}'\|input_pin =\|password =" pwa/supabase/**/*.sql

# 4. SECRET DEFINER sin search_path
grep -n -A5 "SECURITY DEFINER" pwa/supabase/**/*.sql | grep -c "SET search_path"

# 5. Estado de auth en cliente
grep -rn "sessionStorage\|localStorage.*auth\|authenticated" pwa/src/

# 6. PINs comparados en cliente
grep -n "=== pin\|== pin\|pin ===" pwa/src/components/*.tsx
```

---

## Cómo informar

Sé explícito sobre el estado real. **Este modelo es débil por diseño, no por
accidente**, y conviene decirlo con claridad:

1. **Qué está expuesto ahora**, no qué podría exponerse. H3 (RLS abierto) sigue
   siendo un hecho presente, no un riesgo futuro. H1 y H2 ya están arreglados en
   el código; de H1 solo queda revocar la clave antigua.
2. **Qué impacto tiene**: datos de ventas de otros negocios, lectura, y
   escritura.
3. **Qué es un arreglo de una línea y qué es un rediseño.** Revocar una clave en
   Google AI Studio son 5 minutos. Un cambio de RLS es un rediseño.
4. **Qué NO arregla lo que propongas.** Arreglar el backdoor de SQL sin quitar
   el flag de `sessionStorage` (H5) deja la puerta abierta igual.
5. **El orden**: revocar claves filtradas es lo primero, siempre, y es
   independiente del resto.

No propongas añadir autenticación, PIN o RLS nuevos sin describir antes el modelo
de amenazas actual. Si la petición es "añade un campo más de PIN", explica
primero que el control de acceso actual no protege los datos que intenta
proteger.

---

## Referencias

- `references/known-issues.md` — el inventario completo con las ubicaciones
  exactas y el orden de arreglo sugerido.
