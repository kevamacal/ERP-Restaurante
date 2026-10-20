---
name: Verificar despliegue
description: Usar antes de hacer commit, antes de desplegar a Vercel y siempre que el usuario diga "despliega", "despliega", "commit", "publica" o "sube". Ejecuta el checklist de lint, build, escaneo de secretos y estado del esquema antes de dar cualquier cambio por listo para producción.
---

# Verificación antes de commitear o desplegar

## Cuándo aplicar esta skill

- Antes de cualquier `git commit` o `git push`.
- Antes de `vercel --prod` o de pedir un despliegue.
- Cuando el usuario diga "despliega", "sube", "publica", "commit".
- Al final de cualquier sesión en la que se haya tocado código.

Checklist completo en `references/checklist.md`. Resumen:

```bash
cd pwa && npm run lint && npm run build && npm run test
```

---

## Orden de ejecución

### 1. Lint, build y tests

```bash
cd pwa && npm run lint && npm run build && npm run test
```

Los tres deben pasar. `npm run build` corre `tsc -b`, que es la puerta de tipos.
`npm run test` corre los tests de vitest (`pwa/tests/`).

> ⚠ **El lint en verde no significa calidad.** `.oxlintrc.json` solo activa dos
> reglas (`react/rules-of-hooks` y `react/only-export-components`). `strict` sí
> está activado, pero `.select("*")` devuelve `any` y hay lógica sin test que
> ninguna regla detecta. Si informas de "todo verde", di también qué ha quedado
> sin cubrir.

### 2. Escaneo de secretos ⚠

Este repositorio ya filtró credenciales reales. **Ejecuta esto siempre.**

```bash
# Secretos reales en ficheros que SÍ se versionan
git ls-files | xargs grep -nI \
  -E 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{20,}' \
  2>/dev/null

# Secretos horneados en el bundle de producción
grep -rnE 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{20,}' pwa/dist/ 2>/dev/null

# Ficheros que NO deberían estar versionados
git ls-files | grep -E '\.env$|\.vercel/|node_modules/|\.DBF$|\.db$'
```

`sb_publishable_...` **no** es un secreto: es la clave pública de Supabase y
está diseñada para ir en el navegador. No la trates como fuga; quien protege los
datos es RLS. Lo que nunca puede aparecer es `sb_secret_...`, `service_role` ni
claves de proveedores (Gemini `AQ.Ab...` / `AIza...`).

Si el primero o el segundo devuelven algo, **no despliegues**. Para de inmediato
y avisa: rotar una clave que ya salió del repositorio no basta con borrarla del
fichero, hay que **revocar la clave en el proveedor**.

Estado actual: Gemini ya no se hornea. La llamada vive en la Edge Function
`pwa/supabase/functions/analyze-invoice/` y la key se configura con
`npx supabase secrets set GEMINI_API_KEY=...`. Si el escaneo del bundle sigue
encontrando `AQ.Ab...`, falta reconstruir `pwa/dist` (`npm run build`).

### 3. Estado del esquema

```bash
ls -1 pwa/supabase/migrations/
git ls-files pwa/supabase/     # probablemente vacío
```

⚠ `.gitignore:4` contiene `*.sql`, así que **las migraciones no están
versionadas**. Si has creado o modificado una migración, va a quedar solo en tu
disco. Dilo explícitamente en el resumen; no des por hecho que llegará al
repo.

Confirma también que has aplicado la migración en Supabase, no solo escrito el
fichero.

### 4. Diff

```bash
git status --short
git diff --stat
```

Comprueba que:

- No hay ficheros generados: `pwa/dist/`, `node_modules/`, `*.tsbuildinfo`.
- No hay secretos nuevos (paso 2).
- No hay cambios en ficheros que no deberían cambiarse.

### 5. Revisión manual de lo que el tool no cubre

Estos cinco puntos **no los detecta ninguna herramienta** en este proyecto:

1. ¿Las queries nuevas filtran por `empresa_id`?
2. ¿Las columnas usadas existen en una migración aplicada?
3. ¿Hay IDs HTML duplicados? (`HorarioAdminSection.tsx` y `GastosSection.tsx`
   montan sus hijos dos veces)
4. ¿Hay `any` nuevos?
5. ¿Las fechas nuevas llevan `'es-ES'` explícito?

### 6. Despliegue

```bash
cd pwa
npm run build
vercel --prod
```

`vercel.json` solo define el rewrite SPA → `/index.html`. **No define
`Cache-Control` para `sw.js` ni cabeceras de seguridad.**

⚠ `public/sw.js` tiene un `CACHE_NAME` estático sin versión
(`pwa/public/sw.js:1`). Tras un despliegue, los clientes con el service worker
cacheado pueden servir **hashes JS antiguos** de forma indefinida. Si el
despliegue rompe la app para usuarios que ya la tenían instalada, mira aquí
primero.

### 7. Informe

Al terminar, informa de:

- Qué pasó el lint, el build y los tests.
- Qué encontró el escaneo de secretos, incluido lo preexistente.
- Si hay migraciones sin aplicar o sin versionar.
- Qué has verificado a mano.
- **Qué no has podido verificar** (lo que no tenga test; nada valida el SQL).

No declares "listo para producción" si el escaneo de secretos devuelve algo,
aunque sea preexistente y ya conhecido.

---

## Referencias

- `references/checklist.md` — la lista completa, con casillas.
