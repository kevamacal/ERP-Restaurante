---
name: Supabase Migration
description: Usar al cambiar el esquema de base de datos en pwa/supabase - columnas, tablas, RLS, políticas, triggers, funciones RPC o índices. Cubre el checklist de aislamiento por empresa_id, idempotencia, contrato de upsert con el agente Python y los puntos donde el frontend se queda desincronizado.
---

# Migraciones de Supabase

## Cuándo aplicar esta skill

Carga esta skill **antes** de escribir SQL en cualquiera de estos casos:

- Añadir, cambiar o eliminar una columna o tabla.
- Tocar una política RLS, o añadir una tabla nueva.
- Crear o modificar una función RPC, un trigger o un índice.
- Cualquier cambio que afecte a lo que el agente Python sube.

Lee primero `pwa/supabase/AGENTS.md`: sus reglas son vinculantes. Esta skill es
el procedimiento, no la ley.

---

## Workflow

### 1. Reconstruye el estado actual antes de escribir nada

```bash
ls -1 pwa/supabase/migrations/
```

Ordena por nombre de fichero. Ese es el orden real de aplicación. No asumas el
esquema: **no existe** `supabase db pull` ni introspección configurada, y
`.gitignore` ignora `*.sql`, así que el repo no es fuente de verdad.

Lee entera la migración más reciente que toque el área que vas a cambiar. Fíjate
en el estilo que usa el autor para no divergir.

### 2. Clasifica el cambio

| Tipo | Qué hay que actualizar además |
|---|---|
| Columna nueva | `pwa/src/types.ts` (interfaz del dominio) |
| Columna renombrada o eliminada | `types.ts` + **todas** las queries `.select()` del frontend |
| Tabla nueva | RLS + política + trigger `empresa_id` + tipos + hook |
| Política RLS | Nada más, pero es el cambio de mayor riesgo (§4) |
| Función RPC | `REVOKE ... FROM anon` + cliente que la llama |
| Constraint `UNIQUE` de una tabla que sube el agente Python | ⚠ Ver §5 |
| Columna de dinero | `NUMERIC(10,2)`, nunca `FLOAT` |

### 3. Escribe la migración

Nombre: `pwa/supabase/migrations/YYYYMMDD_descripcion_corta_en_snake.sql`

Plantilla:

```sql
-- <Motivo en una frase. Por qué este cambio, no qué hace.>

-- 1. Estructura
ALTER TABLE public.<tabla>
  ADD COLUMN IF NOT EXISTS <columna> <tipo> DEFAULT <valor>;

-- 2. Índices para las consultas que realmente se hacen
CREATE INDEX IF NOT EXISTS idx_<tabla>_<columna>
  ON public.<tabla> (<columna>);

-- 3. Seguridad: RLS explícito
ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "<nombre>" ON public.<tabla>;
CREATE POLICY "<nombre>" ON public.<tabla>
  FOR ALL
  USING (
    empresa_id IN (
      SELECT id FROM public.empresas WHERE owner_user_id = auth.uid()
    )
  );

-- 4. Integridad a nivel de base de datos
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = '<constraint>'
    ) THEN
        ALTER TABLE public.<tabla>
          ADD CONSTRAINT <constraint> UNIQUE (<cols>);
    END IF;
END $$;
```

**Prohibido** `EXCEPTION WHEN OTHERS THEN NULL;` en cualquier bloque `DO $$`.
Ver `references/rls-checklist.md` §5 para el porqué.

### 4. Aplica el checklist de RLS

Obligatorio antes de seguir. Está en `references/rls-checklist.md` y se resume:

- Ninguna política con `USING (true)` ni `WITH CHECK (true)`.
- Ninguna con `OR auth.uid() IS NULL` como atajo.
- Toda tabla de tenant filtra por `empresa_id`.
- Responde por escrito: **¿qué puede hacer un usuario no autenticado con la
  anon key?** La anon key va en el bundle de producción, es pública.

### 5. Comprueba el contrato con el agente Python

Si tu migración afecta a una de estas tablas, el contrato con `sync_agent.py`
puede romperse:

```bash
grep -n "on_conflict\|upload_in_batches" sync_agent.py sync_productos.py
```

El upsert usa `Prefer: resolution=merge-duplicates` contra un `on_conflict`. Si
falta el `UNIQUE` correspondiente, **PostgREST devuelve 409 y el agente descarta
el lote**. Con el bloque `WHEN OTHERS THEN NULL`, la migración "aplica bien" y el
sync falla en silencio.

Además, mira si tu columna la rellena `extract_metrics` (sync diario),
`extract_all` (histórico) o ambos. Hoy están desalineados en
`total_pendiente`.

### 6. Ajusta el resto del proyecto

```bash
grep -rn "\.select(\|from('" pwa/src/ | grep -i "<tabla_afectada>"
```

Todo `.select("*")` devolverá la columna nueva automáticamente, así que una
columna añadida no rompe nada. Una columna **renombrada o eliminada sí**, y
`tsc` no lo detecta porque no hay tipos generados de Supabase.

- [ ] `pwa/src/types.ts` — interfaz del dominio actualizada
- [ ] Queries `.select()` que listaban la columna renombrada
- [ ] `sync_agent.py` / `sync_productos.py` — si cambia el payload o el
      `on_conflict`
- [ ] `README.md` — si el cambio altera el modelo de datos documentado

### 7. Verifica

```bash
cd pwa && npm run lint && npm run build
```

El build no valida SQL, pero sí detecta si rompiste un tipo del frontend.

Después, en el SQL Editor de Supabase, comprueba que la migración **no dejó
constraint duplicados ni políticas huérfanas**:

```sql
SELECT conname, conrelid::regclass FROM pg_constraint
WHERE conname LIKE '<constraint>%';

SELECT policyname, tablename FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
```

---

## Errores frecuentes en este repositorio

| Error | Consecuencia |
|---|---|
| Editar una migración aplicada | Las instancias existentes no la reejecutan. Divergencia silenciosa. |
| `WHEN OTHERS THEN NULL` | El constraint falla y nadie se entera. |
| Política `USING (true)` | La anon key lee/escribe ventas de todos los tenants. Ya existe en `20260908_enable_rls_policies.sql:98-107`. |
| Copiar una definición de `seed_demo_data.sql` | `seed_demo_data.sql` y `migrations/` definen funciones y columnas **contradictorias**. Gana el orden de aplicación. |
| Olvidar `types.ts` | La columna existe en BD y no en el tipo. O al revés. Ningún tool lo detecta. |
| Recortar el aislamiento por rendimiento | Las políticas miden poco; los datos de otros tenants, mucho. |

---

## Referencias

- `references/rls-checklist.md` — checklist completo + patrones correctos de
  política por caso de uso.
