# AGENTS.md — ERP-Restaurante

Instrucciones para agentes que trabajan en este repositorio. Se aplican a todo el
proyecto salvo que un `AGENTS.md` anidado (en `pwa/` o `pwa/supabase/`) dé
indicaciones más específicas para esa zona.

---

## 1. Qué es este proyecto

Sistema de gestión para restaurantes que **no reemplaza el TPV existente**. Lee
los ficheros DBF que genera el TPV local y los replica a Supabase, y expone un
panel PWA para consultar métricas, gastos y control horario.

```
TPV local  ──▶  *.DBF  ──▶  sync_agent.py  ──HTTPS──▶  Supabase / PostgreSQL  ◀──  PWA React
(cabecera.DBF, detalle.DBF)   (Python, raíz)                        (browser / móvil)
```

Puntos clave de la arquitectura:

- **El TPV es la fuente de verdad operativa.** Supabase es un espejo para
  explotación y visualización. Nunca se escribe de vuelta al TPV.
- **La red es un punto único de fallo.** Si el agente Python cae, el panel
  muestra datos obsoletos. No hay doble escritura.
- **La app sirve a dos audiencias distintas** con flujos distintos:
  - El **propietario** se autentica con Supabase Auth y ve el dashboard completo.
  - El **empleado en la terminal** ficha con un PIN numérico, sin sesión de
    usuario, posiblemente sin conexión fiable.

---

## 2. Mapa del repositorio

Son **dos subproyectos independientes** más un tercero de esquema. Un cambio en
uno no obliga a tocar los otros.


Convenciones: `pwa/AGENTS.md` y `pwa/supabase/AGENTS.md` tienen las reglas
específicas de cada subproyecto. Léelos antes de tocar código de esas zonas.

---

## 3. Comandos

### Frontend (siempre con `cwd` en `pwa/`)

```bash
cd pwa
npm run build    # tsc -b && vite build  ← puerta de tipos + build
```

### Agente Python (cwd en la raíz del repo)

```bash
python sync_agent.py --mode sync --dbf-dir ../datos --local-id local_1 --interval 600
python sync_agent.py --mode upload-all --dbf-dir ../datos --local-id local_1
python sync_productos.py --dbf-dir ../datos
```

| Flag | Default | Notas |
|---|---|---|
| `--local-id` | `local_1` | ⚠ Verificar que existe en la tabla `locales` antes de usarlo |

---

## 4. Vocabulario de dominio

Interpretar mal estos términos produce cálculos financieros incorrectos.

| Término | Significado |
|---|---|
| **Día comercial** | ⚠ **No es el día natural.** Un ticket de las 01:30 pertenece al servicio que empezó el día anterior. El corte está en las **02:00**. |
| **Ticket pendiente** | `CAB_ESTADO` pendiente: cuenta como importe pendiente, **no** como venta cobrada. |

**Regla del día comercial**: el corte de las 02:00 está implementado y duplicado
en `sync_agent.py:326` y `sync_agent.py:514`. Si tocas una mitad, toca la otra, o
extrae una constante compartida. La discrepancia entre ambos puntos produce
facturación descuadrada.

---

## 5. Stack (versiones exactas)

| Zona | Tecnología |
|---|---|
| Frontend | React 19.2, TypeScript ~6.0, Vite 8, Tailwind CSS 4, Recharts 3, lucide-react |
| Datos | `@supabase/supabase-js` 2, PostgreSQL vía Supabase |
| Lint | oxlint 1.74 (⚠ solo 2 reglas activas, ver §8) |
| Agente | Python 3.10+, `dbfread` (⚠ sin versión fijada, ver §9) |
| Deploy | Vercel (SPA rewrites) |

---

## 6. Reglas duras

Estas no son sugerencias. Si una regla choca con una petición, **dilo antes de
cumplir la petición**.

| `sync_agent.py` | No se debe tocar a menos que el usuario proponga algún tipo de dato perteneciente a los archivos dbf que actualmente no se esté contemplando

### 6.1 Secretos

- **Nunca pongas una clave con privilegios en una variable `VITE_*`.** Vite las
  inlinea en el bundle en tiempo de build: cualquier visitante puede extraerla.
  Una clave de servidor (Gemini, Supabase `service_role`) va en una Edge
  Function de Supabase o en una Serverless Function de Vercel, nunca en el
  cliente.
- **Ningún secreto en un fichero versionado.** Scripts (`.bat`, `.sh`,
  `start_sync.*`), configuraciones y docs leen siempre del entorno o de `.env`.
- **`.env` no se versiona** y debe seguir así. No lo relajes en ningún `.gitignore`.

Estado actual (ya arreglado en el código; no lo des por hecho sin comprobarlo):

- **Gemini vive en el servidor.** `pwa/supabase/functions/analyze-invoice/` es
  una Edge Function que lee `GEMINI_API_KEY` como secreto de Supabase y valida
  el JWT del usuario. El frontend llama con `supabase.functions.invoke()` y no
  conoce ninguna clave. **No vuelvas a añadir `VITE_GEMINI_API_KEY`** ni
  ninguna otra `VITE_*` con privilegios.
- **`start_sync.bat` no contiene credenciales.** Solo invoca `sync_agent.py`,
  que carga `SUPABASE_URL` / `SUPABASE_KEY` desde el `.env` no versionado del
  directorio. `start_sync.bat` puede versionarse sin riesgo; el `.env` no.
- **`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sí llevan `VITE_`** y es
  correcto: son valores públicos por diseño (la clave `sb_publishable_...` no
  da privilegios; quien protege los datos es RLS). No las renombres: Vite solo
  expone al navegador las variables `VITE_*` y el build se rompería.

Checklist al tocar cualquier integración nueva:

- ¿La clave es de servidor? → Edge Function / Serverless, nunca `VITE_*`.
- ¿El fichero con la clave está fuera de git? → `.env` (ignorado) o secreto del
  proveedor.
- Tras tocar variables: `cd pwa && npm run build` y comprobar que el bundle no
  contiene ninguna clave (`grep -rE 'AQ\.Ab|AIza|sb_secret_[A-Za-z0-9_-]{20,}' pwa/dist/`).

### 6.2 Esquema de base de datos

- **Esquema → migración nueva.** Nunca edites una migración ya aplicada: las
  instancias ya sincronizadas no la volverían a ejecutar. El nombre va en
  `pwa/supabase/migrations/YYYYMMDD_descripcion_corta.sql`.
- ⚠ **`.gitignore` raíz contiene `*.sql`**, así que **una migración nueva no
  llega al repositorio**. Trátalo como una limitación conocida del tooling, no
  como que el SQL no importe.
- Nunca `USING (true)` ni `WITH CHECK (true)` en una política RLS. Toda política
  filtra por `empresa_id` derivado de `auth.uid()`.
- Detalles y checklist en `pwa/supabase/AGENTS.md`.

### 6.3 Contrato entre el agente Python y la base de datos

El upsert del agente depende de constraints `UNIQUE`. Si los tocas, actualiza
también la migración que los declara, o el sync empieza a fallar en silencio
contra todos los lotes.

| Tabla | `on_conflict` | Constraint |
|---|---|---|
| `ventas_resumen_diario` | `local_id,fecha,turno` | `unique_resumen_local_fecha_turno` |
| `ventas_por_hora` | `local_id,fecha,hora` | `unique_ventas_hora_local_fecha_hora` |
| `locales` | `id` | PK |
| `productos` | `codigo` | PK |

Ojo: los bloques `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` de
`20260908_enable_rls_policies.sql:31,43` **se tragan los errores**. Si un
constraint falla, la migración termina "con éxito" sin crearlo.

### 6.4 Dinero

- **Python: `decimal.Decimal`, nunca `float` + `round()`.** El redondeo en
  binario produce céntimos que no cuadran. `decimal` ya está importado en
  `sync_agent.py`; úsalo para aritmética, no solo para castear.
- **TypeScript: `Intl.NumberFormat('es-ES', { currency: 'EUR' })`.** No concatenas
  `" €"` a mano.
- Los importes viajan como `NUMERIC(10,2)` en Postgres. No los pases por `float`
  en el JSON.

---

## 7. Convenciones de commit

Aplicar la regla de **Conventional commits** en español.

---

## 8. Requisitos de verificación

Antes de dar por terminado cualquier cambio:

```bash
cd pwa && npm run lint && npm run build && npm run test
```

Los tres deben pasar. `npm run build` ejecuta `tsc -b`, así que es también la
puerta de tipos. Si tocas la Edge Function del OCR:

```bash
deno check pwa/supabase/functions/analyze-invoice/index.ts
```

> ⚠ **El lint en verde no significa calidad.** `.oxlintrc.json` solo activa dos
> reglas (`react/rules-of-hooks` y `react/only-export-components`). `strict` sí
> está activado en `tsconfig.app.json`, pero `.select("*")` devuelve `any` y hay
> `any` sueltos que ninguna regla detecta. No declares "todo correcto" basándote
> solo en el lint.

Si añades lógica de cálculo (horas de turno, coste laboral, beneficio, agregado
de periodos), esa lógica va **acompañada de tests**. Hay vitest configurado en
`pwa/` (`npm run test`, tests en `pwa/tests/`); el agregado de fichajes
(`pwa/src/utils/shiftMetrics.ts`) es el primer caso cubierto. Para lo que no
tenga test, verifica a mano con casos límite y dilo explícitamente.

---

## 9. Cómo trabajar aquí

Reglas de comportamiento:

- **Si un cambio de frontend toca datos, mira también el SQL.** Añadir una
  columna en `types.ts` sin migración deja la app rota en runtime, y `tsc` no lo
  detecta porque `.select("*")` devuelve `any`.
- **Si un cambio del agente toca una clave de upsert, mira también la
  migración** que declara el `UNIQUE`.
- **No introduzcas autenticación, PIN, RLS ni validación de IP nuevos** sin
  señalar antes el modelo de amenazas actual, que es débil por diseño (§9).