# Checklist de verificación

Lista completa para commit y despliegue. Marca cada punto; no des por buena una
fase que no has ejecutado.

---

## Fase 1 · Build

- [ ] `cd pwa && npm run lint` → sin errores
- [ ] `cd pwa && npm run build` → sin errores de `tsc` ni de Vite
- [ ] `cd pwa && npm run test` → sin fallos
- [ ] He anotado que `npm run lint` solo cubre 2 reglas, aunque `strict` sí está activo
- [ ] No he introducido `any` nuevos
- [ ] No he introducido imports rotos o componentes referred pero no usados

---

## Fase 2 · Secretos ⚠ CRÍTICO

```bash
git ls-files | xargs grep -nI \
  -E 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{20,}' \
  2>/dev/null
```

- [ ] Sale vacío
- [ ] Si **no** sale vacío → **no despliegues**. La clave está en el historial
      de git: hay que **revocarla en el proveedor**, no solo borrarla.
- [ ] `sb_publishable_...` NO cuenta como secreto (es pública por diseño)

```bash
grep -rnE 'AQ\.Ab[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{20,}' pwa/dist/ 2>/dev/null
```

- [ ] Sale vacío
- [ ] Si sale algo: la clave está **en producción ahora mismo**. Cualquiera que
      abra el panel la tiene.
- [ ] Si sale un `AQ.Ab...` antiguo, falta `npm run build` o hay que revocar la
      clave en Google AI Studio

```bash
git ls-files | grep -E '\.env$|\.vercel/|node_modules/|dist/|\.DBF$|\.db$'
```

- [ ] Solo aparecen entradas esperadas
- [ ] `.env` NO versionado
- [ ] `.vercel/` NO versionado
- [ ] `*.DBF` / `*.db` NO versionados

**Estado:** la clave de Gemini ya no se hornea (vive en la Edge Function
`analyze-invoice`). Revocar en Google AI Studio la clave antigua sigue pendiente
si no se ha hecho ya.

---

## Fase 3 · Esquema

- [ ] ¿He creado o modificado alguna migración?
- [ ] `ls -1 pwa/supabase/migrations/` → la nueva tiene nombre `YYYYMMDD_desc.sql`
- [ ] No he editado una migración ya aplicada
- [ ] ⚠ Recordar: `.gitignore:4` ignora `*.sql`, así que **la migración no está
      versionada**. Hay que decirlo en el informe.
- [ ] La migración **está aplicada en Supabase**, no solo escrita en disco
- [ ] Si es una tabla nueva: RLS habilitado y política creada
- [ ] Si es una política: sin `USING (true)`, sin `WITH CHECK (true)`, sin
      `auth.uid() IS NULL`
- [ ] Si es `SECURITY DEFINER`: con `SET search_path` y `REVOKE ... FROM anon`
- [ ] `pwa/src/types.ts` actualizado si el frontend usa la columna

---

## Fase 4 · Diff

```bash
git status --short
git diff --stat
```

- [ ] No hay ficheros generados (`pwa/dist/`, `*.tsbuildinfo`, `node_modules/`)
- [ ] No hay secretos nuevos
- [ ] No hay cambios en ficheros que no tocaba el cambio
- [ ] `pwa/package-lock.json` solo ha cambiado si se instalaron dependencias

---

## Fase 5 · Revisión manual ⚠ nada de esto lo detecta ninguna herramienta

- [ ] Las queries nuevas filtran por `empresa_id`
- [ ] Las columnas usadas existen en una migración aplicada
      (`.select("*")` devuelve `any`: `tsc` no detecta una columna inexistente)
- [ ] No hay IDs HTML duplicados (los wrappers de sección montan sus hijos dos
      veces)
- [ ] Fechas con `'es-ES'` explícito
- [ ] Moneda con `Intl.NumberFormat`, no `" €"` a mano
- [ ] `<label>` con `htmlFor`; botones solo-icono con `aria-label`
- [ ] Mensajes de estado en un `aria-live="polite"`
- [ ] Estados de `loading` y de `error` visibles, no un render vacío
- [ ] Si tocaba auth, PIN, RLS o validación de IP → **revisión de seguridad**
      (skill `security-audit`)

---

## Fase 6 · Lógica de cálculo

Si has tocado `useShiftMetrics`, `PeriodSummariesSection`, `dateUtils` o el día
comercial del agente:

- [ ] Turno a las 01:59 → día comercial anterior ✓
- [ ] Turno a las 02:01 → día comercial actual ✓
- [ ] Intervalo de más de 16 h → se cuentan las horas reales (hay test en
      `pwa/tests/shiftMetrics.test.ts`)
- [ ] Entrada sin salida → no suma horas
- [ ] Turno que cruza medianoche
- [ ] Semana que cruza cambio de año
- [ ] Redondeo a 30 min: 12:15 → 12:30, 12:45 → 13:00
- [ ] Importes con `Decimal`, sin `float + round()`

> `pwa/src/utils/shiftMetrics.ts` sí tiene tests. El resto de la lógica de
> cálculo (periodos, beneficio) no. Dilo explícitamente en el informe.

---

## Fase 7 · Despliegue

- [ ] `cd pwa && npm run build` en verde
- [ ] `vercel --prod`
- [ ] `vercel.json` solo tiene el rewrite SPA; sin `Cache-Control` para
      `sw.js` ni cabeceras de seguridad
- [ ] ⚠ `public/sw.js:1` tiene `CACHE_NAME` estático sin versión: tras el
      deploy, clientes con SW cacheado pueden servir JS antiguo
- [ ] Comprobar en el móvil, no solo en escritorio (es una PWA)

---

## Informe final

Antes de cerrar, informa de:

- [ ] Resultado del lint y del build
- [ ] Resultado del escaneo de secretos (incluido lo preexistente)
- [ ] Estado de las migraciones (aplicadas / sin versionar)
- [ ] Qué verificaste a mano
- [ ] **Qué no pudiste verificar** — no hay tests y nada valida SQL

No digas "listo para producción" si el escaneo de secretos devuelve algo,
aunque sea preexistente.
