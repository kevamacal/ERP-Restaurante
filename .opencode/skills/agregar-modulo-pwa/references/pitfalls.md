# Trampas reales del repo

Cada punto está verificado en el código. Referencia `archivo:línea` para que
puedas comprobarlo antes de repetir el error.

La primera sección recoge lo que ya se corrigió: está aquí para que no se
reintroduzca. La segunda es deuda viva.

---

# Ya resuelto — no lo reintroduzcas

## `localStorage`: parseo defensivo y escritura segura

`utils/localStorage.ts` expone `readJsonArray`, `writeJson` y `randomId`. Úsalos
en cualquier lector o escritor de `localStorage`.

- `JSON.parse` directo en un inicializador de `useState` rompía la app al montar
  si el valor estaba corrupto.
- Un array válido no implica elementos válidos: en gastos, además, se filtra con
  `isGasto` (`utils/typeGuards.ts`) porque un registro sin `importe` numérico
  reventaba en `importe.toFixed(2)`.
- `crypto.randomUUID` es una función: `crypto.randomUUID ? … : …` siempre daba
  `true`. `randomId` usa `globalThis.crypto?.randomUUID?.()`.

## El fallback local de gastos es visible

`useGastosManagement` expone `fallbackReason` (`"sin_supabase"` /
`"tabla_ausente"` / `null`) y `GastosSection` pinta un banner persistente con
`role="status"`. Si añades otro fallback silencioso, estás repitiendo el bug.

## El tema conserva las clases base del `<body>`

`App.tsx` usa `classList.toggle('dark', …)` sobre `<html>` y añade/quita solo
`dark` y `light` sobre `<body>`. `document.body.className = theme` borraba
tipografía, color de selección y demás clases de `index.html`.

## Los costes son configurables de verdad

`useCostSettings` lee `app_food_cost_pct` y `app_hourly_wage` con validación y
tope. `SettingsModal` está montado desde `App.tsx` y el Header abre con el botón
de ajustes. Si añades un parámetro de coste, léelo de ahí o de BD, no lo
hardcodees en `App.tsx`.

Limitación conocida: viven en `localStorage`, así que son por dispositivo y no
por empresa.

## El cálculo de fichajes cuenta la duración real

`utils/shiftMetrics.ts` (`aggregateShiftHours`) no sustituye un intervalo largo
por 8 h. Se cuentan las horas reales entre `entrada` y `salida`; si falta una
salida, se corrige con el fichaje manual. El agregado tiene tests en
`tests/shiftMetrics.test.ts`.

El corte de día comercial a las 02:00 se mantiene y está duplicado a propósito
con `sync_agent.py`: si tocas una mitad, toca la otra.

---

# Deuda pendiente

## 1. Resolución de `empresaId` duplicada 5 veces

`useDashboardData.ts:18-29`, `useDashboardData.ts:65-75`,
`useEmployeeManagement.ts:21-33`, `useFichajesManagement.ts:31-42`,
`useGastosManagement.ts:45-56`.

El bloque copia la consulta `empresas.select('id').eq('owner_user_id', …)` en
cinco sitios, dos de ellos **en el mismo fichero**.

Consecuencia: si no hay sesión, esas queries **no filtran por `empresa_id`** y
devuelven los datos de todos los tenants.

**Hazlo así:** extrae `useEmpresaActiva()` y úsalo. Si además quieres quitar las
cinco copias de golpe, es un refactor con valor real — dilo antes de hacerlo.

## 2. Wrappers que montan los hijos DOS veces

`HorarioAdminSection.tsx:42,84` y `GastosSection.tsx:63,95`.

Renderizan la versión desktop y la móvil de los mismos hijos a la vez, en vez de
una u otra. Produce:

- IDs HTML duplicados: `newEmpNameInput`, `newEmpPinInput`, `manualEmpSelect`,
  `manualFechaHoraInput`, `gastoProv`, `gastoConcept`, `gastoImp`, `gastoCat`,
  `gastoFech`.
- `htmlFor` resuelve siempre al primero → HTML inválido, lector de pantalla
  desincronizado.
- Doble coste de render y dos instancias de estado montadas.

**Hazlo así:** renderiza el hijo una vez y pon `hidden md:block` / `md:hidden`
dentro del hijo.

## 3. `useAuth()` instanciado dos o tres veces

`App.tsx:47`, `OwnerLoginView.tsx:39`, `AuthModal.tsx:30`.

Cada instancia registra su propio `onAuthStateChange` y duplica la consulta
`SELECT * FROM empresas` en cada evento de autenticación.

Además `AuthModal.tsx` está montado pero devuelve `null` siempre: nadie pone
`isAuthOpen` a `true` (`App.tsx:48`). Son ~312 líneas muertas con un hook activo.

## 4. Rutas por `search` en lugar de un router

`App.tsx:126`:

```ts
window.location.search.includes("admin")
```

Casa con cualquier URL que contenga la subcadena: `?page=administracion`
también entra por la vista admin.

## 5. Modales sin focus trap

`ConfirmDeleteModal.tsx`, `AuthModal.tsx`, `EmployeePinPadOverlay.tsx` no tienen
`role="dialog"`, `aria-modal`, `Esc` ni devolución del foco al elemento que los
abrió. `SettingsModal.tsx` ya tiene `role="dialog"`, `aria-modal` y `Esc`, pero
tampoco atrapa el foco.

Si añades un modal, no copies el patrón incompleto.

## 6. Localización inconsistente

Con `'es-ES'` explícito: `HistoricoSection.tsx`, `WeeklyPaymentsTable.tsx`.

**Sin** locale, dependiente del navegador: `ClockInView.tsx:422`,
`FichajesHistoryTable.tsx:57,60,112-113`, `App.tsx:154-155,318-320`.

Un móvil en inglés muestra `MM/DD/YYYY` en unas pantallas y `DD/MM/YYYY` en
otras, dentro de la misma app.

`NOMBRES_MESES` (`PeriodSummariesSection.tsx:13-16`) reimplementa lo que
`toLocaleDateString('es-ES', { month: 'long' })` ya resuelve.

## 7. Rutas que no devuelven su refetch

`useDashboardData.ts:178-187` no devuelve `fetchLocales`, así que no se puede
repetir a mano. `useDashboardData.ts:137-176` calcula `dailyResumenData`, un
memo O(n) que no consume nadie.

## 8. Detección ingreso/gasto por dos vías

Cuatro sitios deducen si un registro es ingreso o gasto, y todos combinan `||`
entre `tipo` y `categoria`, dejando dos fuentes de verdad para el mismo hecho:
`App.tsx:141`, `GastosTable.tsx:47,116`, `useShiftMetrics.ts:300`.
