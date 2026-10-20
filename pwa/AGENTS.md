# AGENTS.md — pwa/ (frontend)

Instrucciones específicas del subproyecto frontend. Complementan el `AGENTS.md`
de la raíz, que se sigue aplicando.

---

## 1. Stack y comandos

```bash
cd pwa
npm run dev       # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview
```

React 19.2 · TypeScript ~6.0 · Vite 8 · Tailwind CSS 4 · Recharts 3 ·
lucide-react · `@supabase/supabase-js` 2.

Variables de entorno (`.env` local, nunca versionado; plantilla en
`.env.example`):

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Esas dos **deben** llevar `VITE_`: son públicas por diseño (`sb_publishable_...`)
y RLS es quien protege los datos. Cualquier otra credencial (Gemini, service
role) **no** va aquí: se guarda como secreto de la Edge Function
`pwa/supabase/functions/analyze-invoice/` y el cliente la invoca con
`supabase.functions.invoke()`. Si ves una `VITE_*` con privilegios, es un bug.

---

## 2. Dónde va cada cosa

```
src/
├── App.tsx              Orquestador: hash routing, tema, tabs, sesión admin
├── types.ts             Tipos de dominio, snake_case fiel a las columnas
├── supabaseClient.ts    Singleton con validación de env
├── geminiOCR.ts         OCR de facturas contra Gemini  ⚠ ver AGENTS.md raíz §6.1
├── main.tsx             Bootstrap React
│
├── components/
│   ├── <Dominio>/       auth/ · clockIn/ · gastos/ · horario/   ← una carpeta por dominio
│   ├── *Section.tsx     Wrapper de una sección del panel
│   ├── *View.tsx        Vista completa con flujo propio
│   └── *Card.tsx        Tarjeta unitaria
│
├── hooks/               Un hook por entidad de dominio
│   └── useXManagement.ts   estado + fetch + mutaciones
│
└── utils/               Funciones puras, sin React
```

**Regla de ubicación**: si es una función pura sin estado ni React → `utils/`.
Si tiene estado y hace I/O → `hooks/`. Si pinta → `components/`, en la carpeta
del dominio al que pertenece. No crees una carpeta nueva si el dominio ya existe.

---

## 3. Convenciones de código

- **Componentes**: `export const Nombre: React.FC<Props>` en `PascalCase`, un
  componente por fichero, fichero con el mismo nombre que el componente.
- **Hooks**: `useCamelCase`, en `hooks/`, devolver un objeto curado. No expongas
  setters crudos a menos que el consumidor realmente los necesite.
- **Tipos de dominio**: en `types.ts`, en `snake_case` para que mapeen 1:1 con
  las columnas. Los tipos de UI van junto al componente o en `types.ts` si los
  comparten varios.
- **Booleanos**: prefijo `is` / `has`.
- **Handlers**: `handleX` para acción, `requestX` para petición al backend.
- **Imports de tipo**: usa `import type { ... }` (el proyecto tiene
  `verbatimModuleSyntax: true`).

---

## 4. Trampas reales del repo

Estas están en el código actual. No las repitas al escribir código nuevo.

### 4.1 La resolución de `empresaId` está copiada 5 veces

`useDashboardData.ts` (×2, en el mismo archivo), `useEmployeeManagement.ts`,
`useFichajesManagement.ts`, `useGastosManagement.ts` reimplementan el mismo
bloque de ~12 líneas:

```ts
// Patrón repetido — NO lo copies
const { data: { session } } = await supabase.auth.getSession();
const { data: empresa } = await supabase
  .from('empresas').select('id').eq('owner_user_id', session.user.id).single();
```

**Antes de escribir una query nueva, extrae el helper** y úsalo. Y fíjate en el
efecto: si no hay sesión, esas queries **no filtran por `empresa_id`**, o sea,
leen datos de todos los tenants.

### 4.2 Los wrappers de sección montan los hijos DOS veces

`HorarioAdminSection.tsx:44,85` y `GastosSection.tsx:44,75` renderizan una
versión desktop y una móvil de los mismos hijos **simultáneamente**, no
condicionalmente. Resultado:

- IDs HTML duplicados (`newEmpNameInput`, `gastoConcept`, `manualEmpSelect`, …).
  `htmlFor` resuelve siempre al primero → HTML inválido y accesibilidad rota.
- Doble coste de render y doble estado montado.

**No uses esta técnica.** Renderiza el hijo una vez y resuelve la
responsividad con Tailwind (`hidden md:block` / `md:hidden` en el interior del
componente hijo).

### 4.3 El tema debe conservar las clases base del `<body>`

El proyecto tiene dos sistemas de tema a la vez: clases `dark:` de Tailwind y
clases `body.dark` / `body.light` en `index.css`.

`App.tsx` **ya no** hace `document.body.className = theme`: eso borraba las
clases base del `<body>` definidas en `index.html` (tipografía, selección). El
patrón correcto, ya aplicado, es `classList.toggle('dark', …)` sobre `<html>` y
añadir/quitar solo `dark` y `light` sobre `<body>`.

### 4.4 Fechas y moneda

- **Siempre `'es-ES'` explícito.** Hoy está mezclado: `HistoricoSection.tsx` y
  `WeeklyPaymentsTable.tsx` lo pasan, pero `ClockInView.tsx`,
  `FichajesHistoryTable.tsx` y `App.tsx` no. Un móvil en inglés ve
  `MM/DD/YYYY` en unas pantallas y `DD/MM/YYYY` en otras.
- **Moneda con `Intl.NumberFormat`**, nunca `" €"` concatenado a mano.

### 4.5 `strict` sí está activado; no añadas `any`

`tsconfig.app.json` tiene `"strict": true` (además de `noUnusedLocals`,
`noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`). Aun
así, `.select("*")` devuelve `any` y hay `any` sueltos que `tsc` no ve.

**No añadas `any` nuevos.** Usa el tipo de dominio de `types.ts`, o `unknown` +
un type guard. El camino crítico del cálculo (fichajes → horas → coste) ya está
tipado con `FichajeConEmpleado` en `useShiftMetrics.ts` y
`useFichajesManagement.ts`, y el agregado vive en
`utils/shiftMetrics.ts`; no lo reabras con `any[]`.

Ejemplo de lo que hay que hacer en lugar de `as any`:

```ts
// ❌ const cat = e.target.value as any;
// ✅
const cat = e.target.value;
if (isCategoriaGasto(cat)) setCategoria(cat);
```

### 4.6 `.select("*")` no da tipos

Todas las queries devuelven `any` porque no hay tipos generados de Supabase. Por
eso `tsc` no detecta una columna inexistente. **Añadir una columna a `types.ts`
sin migración deja la app rota en runtime sin que el build falle.**

### 4.7 Código muerto: no lo reanesquites

`App.css`, `utils/terminalAuth.ts` y `mockData.ts` no están importados por nadie.
`AuthModal.tsx` se monta pero devuelve `null` siempre (`isAuthOpen` nunca pasa a
`true`). `SettingsModal.tsx` **ya está montado** desde `App.tsx` y es la vía real
para configurar los costes. Si "usas" algo de la lista, primero comprueba que hay
un camino de render de verdad.

---

## 5. Accesibilidad — mínimo exigible

Hoy la app tiene un solo `aria-label` en ~6.500 líneas y bloquea el zoom. Eso no
se propaga:

- **Nunca `user-scalable=no` ni `maximum-scale=1.0`** en `index.html`. Bloquear
  el zoom viola WCAG 1.4.4.
- Todo `<label>` con `htmlFor` que apunte a su input (o envolviendo el input).
- Todo `<button>` solo-icono con `aria-label`.
- Los mensajes de estado y de resultado (`"✓ Fichaje registrado"`, resultado
  del OCR) van en un contenedor con `aria-live="polite"`.
- Los modales necesitan `role="dialog"`, `aria-modal="true"` y cierre con `Esc`.
  Si añades uno, no repitas el patrón incompleto de `ConfirmDeleteModal.tsx`.
- Un elemento con `onClick` que no sea `<button>` necesita `tabIndex={0}` y
  manejo de Enter/Espacio. `GastoFormCard.tsx:229` hoy falla en esto.
- Tabs: `role="tablist"` / `role="tab"` / `aria-selected` / `role="tabpanel"`.

---

## 6. Tailwind y gráficos

- Tailwind 4 se configura por CSS en `index.css` (`@theme`), no por
  `tailwind.config.js`. No crees el fichero.
- Las clases condicionales se hacen hoy con plantillas inline
  (`` `${active ? "a" : "b"}` ``). Si la condicionalidad crece, propón
  `clsx` / `tailwind-merge` como decisión explícita; no lo instales por tu cuenta.
- Los colores de Recharts están **hardcodeados** en `SalesChart.tsx` y
  `HistoricoSection.tsx` y no responden al toggle de tema. Si añades un gráfico,
  usa variables CSS en lugar de hex literales.

---

## 7. Verificación

```bash
npm run lint && npm run build && npm run test
```

Los tres deben pasar. `npm run build` corre `tsc -b`, que es la puerta de tipos.
`npm run test` corre vitest sobre `tests/`, fuera de `src` para que `tsc -b` no
compile los tests.

Recuerda del `AGENTS.md` raíz §8: **el lint en verde no significa calidad**, solo
hay 2 reglas activas. `strict` sí está activado, pero los `any` de Supabase
siguen sin detectarse.

Antes de dar por terminado un cambio que toca datos, comprueba a mano:

- ¿La consulta filtra por `empresa_id`?
- ¿Existe la columna en una migración aplicada?
- ¿Duplica IDs HTML?
- ¿Usa `'es-ES'` explícito en toda fecha nueva?
- ¿Hay algún `any` nuevo?
