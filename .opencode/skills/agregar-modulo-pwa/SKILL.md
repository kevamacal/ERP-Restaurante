---
name: Agregar modulo PWA
description: Usar al añadir una sección, un hook, un componente o una entidad nueva al frontend en pwa/src. Cubre el flujo tipo → hook → componente → sección → registro en App, y las trampas del repo - resolución de empresaId duplicada 5 veces, wrappers que montan hijos dos veces, locale inconsistente y uso de localStorage sin el helper defensivo.
---

# Añadir un módulo al frontend

## Cuándo aplicar esta skill

- Una sección nueva del panel (una pestaña más, un bloque nuevo del dashboard).
- Una entidad de dominio nueva (una tabla más: tipos, hook, CRUD).
- Un componente nuevo dentro de un dominio existente.

Lee `pwa/AGENTS.md` primero: sus reglas son vinculantes.

---

## Flujo

### 1. Ubica el módulo en el dominio

```
src/
├── components/<dominio>/     ← agrupa por dominio, no por tipo
├── hooks/useXManagement.ts
└── types.ts                  ← tipos de dominio, snake_case
```

Dominios que ya existen: `auth/`, `clockIn/`, `gastos/`, `horario/`. **Si tu
funcionalidad pertenece a uno de esos, añádela ahí. No crees una carpeta nueva
por una funcionalidad que encaja en una existente.**

Convenciones que ya usa el repo:

- `export const Nombre: React.FC<Props>` — export nombrado, un componente por
  fichero, fichero con el mismo nombre.
- `useXManagement` para hooks de entidad: estado + fetch + mutaciones.
- Tipos en `types.ts` en `snake_case` para mapear 1:1 con las columnas.
- `import type { ... }` — el proyecto tiene `verbatimModuleSyntax: true`.
- Plantillas en `references/`.

### 2. Define el tipo ANTES de la query

Añade la interfaz a `pwa/src/types.ts` siguiendo el estilo existente
(`interface`, no `type` alias, para los objetos).

```ts
export interface Proveedor {
  id: string;
  empresa_id: string;
  nombre: string;
  cif: string | null;
  activo: boolean;
}
```

Hazlo en este punto, no después. Como todas las queries usan `.select("*")` sin
tipos generados de Supabase, **`tsc` no detecta una columna que no exista**.
La única red es la disciplina.

### 3. Escribe el hook

Plantilla en `references/hook-template.ts`. Puntos no negociables:

**a) No copies el bloque de resolución de empresa.** Está duplicado 5 veces en el
código actual. Antes de escribir la query, propón o crea el helper compartido:

```ts
// src/hooks/useEmpresaActiva.ts  ← el destino correcto
export const useEmpresaActiva = (): { empresaId: string | null } => { ... };
```

**b) Filtra siempre por `empresa_id`.** Si no hay sesión, devuelve vacío. Nunca
consultes sin filtro: eso devuelve datos de todos los tenants.

**c) Revisa el `error`.** El patrón dominante actual lo ignora:

```ts
// ❌ El error se pierde y la UI se queda en blanco sin explicación
const { data } = await supabase.from('x').select('*');
if (data) setState(data);
```

```ts
// ✅
const { data, error } = await supabase.from('x').select('*');
if (error) { setErrMsg(error.message); return; }
setState(data ?? []);
```

**d) Devuelve un objeto curado**, con acciones y no setters crudos, salvo que
el consumidor los necesite de verdad.

**e) Maneja `loading`.** Solo dos hooks del repo lo tienen, y `App.tsx` no
consume ninguno: el dashboard pinta KPIs en `0.00 €` mientras carga. Si añades
un estado de carga, consúmelo en el componente.

### 4. Escribe el componente

Plantilla en `references/component-template.tsx`. Checklist mínimo:

- **Nada de `any`.** `strict` está activado, pero `.select("*")` devuelve `any`
  y `tsc` no verá el problema. Usa el tipo de dominio o `unknown` + type guard.
- **`localStorage` siempre con `utils/localStorage.ts`**: `readJsonArray` valida
  el array, `writeJson` captura cuotas y `randomId` comprueba `crypto` bien.
- **Ningún `id` HTML duplicado.** El componente se monta una vez; la
  responsividad va dentro, con `hidden md:block` / `md:hidden`.
- **`htmlFor` en todo `<label>`.**
- **`aria-label` en botones solo-icono.**
- **Fechas con `'es-ES'` explícito**, siempre.
- **Moneda con `Intl.NumberFormat`**, no `" €"` a mano.
- **Estados de carga y de error visibles**, no un render vacío silencioso.

### 5. Registra la sección en `App.tsx`

`App.tsx` (~530 líneas) es el orquestador: hash routing, tema, tabs, sesión
admin, y prop-drilling de ~40 props.

- Añade la sección al array de tabs y a la función de render de desktop y de
  móvil.
- Si tu componente necesita muchos props, ese es el momento de considerar un
  contexto. **No introduzcas uno sin acuerdo**: es un cambio estructural.

### 6. Verifica

```bash
cd pwa && npm run lint && npm run build && npm run test
```

Y a mano:

- [ ] ¿La query filtra por `empresa_id`?
- [ ] ¿La columna existe en una migración aplicada? (ver skill `supabase-migration`)
- [ ] ¿Usé `useEmpresaActiva` en lugar de copiar el bloque de resolución de `empresaId`?
- [ ] ¿Algún `id` HTML duplicado?
- [ ] ¿Algún `any` nuevo?
- [ ] ¿Fechas sin `'es-ES'`?
- [ ] ¿Leo `localStorage` con `readJsonArray` y no con `JSON.parse`?
- [ ] ¿El `loading` lo consume el componente o se queda sin usar?
- [ ] ¿Los `console.error` son necesarios o ruido?

---

## Trampas documentadas

`references/pitfalls.md` está dividido en dos: lo que ya se corrigió (para no
reintroducirlo) y la deuda viva, con su ubicación exacta. Lo primero incluye
`localStorage` sin parseo defensivo, el fallback silencioso de gastos, el tema
que borraba clases del `<body>`, los costes hardcodeados y el tope arbitrario de
8 h en los fichajes. Lo segundo sigue siendo el doble montaje desktop/móvil, la
resolución de `empresaId` duplicada y los tres `useAuth()`.

---

## Referencias

- `references/hook-template.ts`
- `references/component-template.tsx`
- `references/pitfalls.md`
