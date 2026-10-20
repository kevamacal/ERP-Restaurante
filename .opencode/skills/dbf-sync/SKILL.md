---
name: DBF Sync
description: Usar al tocar sync_agent.py o sync_productos.py - lectura de DBF del TPV, búsqueda binaria, agregación de ventas, día comercial, upsert a Supabase o reintentos de red. Cubre los invariantes del formato DBF, la dependencia de API privada de dbfread, los magic numbers del cálculo del día comercial y el contrato de idempotencia con la base de datos.
---

# Agente de sincronización

## Cuándo aplicar esta skill

- Cualquier cambio en `sync_agent.py` o `sync_productos.py`.
- Un fallo de sincronización, datos que no cuadran, ventas que faltan.
- Un cambio en las tablas `ventas_resumen_diario`, `ventas_por_hora`, `locales`
  o `productos` que afecte a lo que el agente sube.

Lee `AGENTS.md` raíz §4 (vocabulario de dominio) y §6.3 (contrato de upsert)
antes de tocar nada.

---

## Mapa del fichero

`sync_agent.py` (~766 líneas), en orden:

| Símbolo | Qué hace |
|---|---|
| `load_env()` | Lector de `.env` propio. Sobrescribe el entorno real sin comprobar precedencia |
| `CustomFieldParser` | Silencia todo error de parseo devolviendo `None` |
| `parse_dbf_date()` | Normaliza `CAB_FECHA` |
| `OptimizedDBF` | Acceso directo por offset + búsqueda binaria |
| `SupabaseClient` | Cliente HTTP por `urllib`. Upsert por lotes |
| `DBFMetricsExtractor` | Sync de **un** día |
| `DBFHistoricalExtractor` | Carga del **histórico** completo |
| `SyncAgent` | Orquestador + `update_public_ip()` |
| `main()` | argparse + bucle |

`sync_productos.py` es independiente y **duplica** `CustomFieldParser`,
`SupabaseClient`, `upload_in_batches` y `load_env`. No añadas una tercera copia:
extráelos a un módulo común.

---

## Invariantes. No los rompas sin entender el porqué

### I1. El acceso por offset

```python
start_offset = self.header.headerlen + idx * self.header.recordlen
infile.seek(start_offset, 0)
```

Evita cargar el fichero entero en memoria. `OptimizedDBF` hereda de
`dbfread.DBF` con `load=False`.

### I2. ⚠ La búsqueda binaria asume orden ascendente

`find_first_index_by_date()` busca por `CAB_FECHA` y
`find_first_index_by_id()` por `DET_ID`. **Ninguna de las dos comprueba que el
fichero esté ordenado**, y ambas son O(log N) solo si lo está.

Si el TPV inserta fuera de orden, o trunca y reescribe el fichero, el índice
binario es **erróneo y el agente no se queja**: sube datos incorrectos.

**Antes de confiar en una búsqueda binaria sobre un fichero nuevo, valida el
orden en las primeras muestras.** Si no puedes asumirlo, cae a barrido
secuencial.

### I3. ⚠ Dependencia de API privada de `dbfread`

El código usa atributos que **no son API pública**:

```
self._open_memofile()   self._skip_record
self.recfactory        self.raw        self.parserclass
```

No hay `requirements.txt` ni versión fijada. Una actualización de la librería
rompe el agente sin que nada lo indique en el build.

**No amplíes el uso de esta API.** Si necesitas algo que `dbfread` no expone,
implementa el acceso por offset directamente con `struct`, o propón fijar la
versión como primera medida.

### I4. El "safety buffer" de 100 registros

`sync_agent.py:292` y `:377`:

```python
start_idx = max(0, start_idx - 100)   # "Safety buffer"
```

Compensa que la búsqueda binaria devuelva el primer registro **igual** a la
fecha objetivo, saltándose los anteriores de ese mismo día.

Si el DBF tiene más de 100 registros desordenados respecto al punto binario,
**se pierden datos sin ningún aviso**.

Es una heurística sin justificación ni parametrización. Si la tocas, conviértela
en una constante con nombre (`SEARCH_BUFFER`) y explica el número en un
comentario.

### I5. El día comercial

`sync_agent.py:326` y `:514` — **duplicado literal**:

```python
if hora_num < 2: business_date = rec_date - timedelta(days=1)
```

Un ticket de las 01:30 pertenece al día anterior. El corte son las **02:00**.

Si tocas una mitad, toca la otra, o extrae `DAY_CUTOFF_HOUR = 2`. La
discrepancia entre ambos puntos produce facturación descuadrada.

### I6. Estados de ticket

| Constante | Valores | Significado |
|---|---|---|
| Cerrado | `'C'`, `'c'` | Venta cobrada |
| Pendiente | `'P'`, `'p'` | Cuenta en `total_pendiente`, no en venta |

⚠ **Bug activo**: `extract_metrics:310` acepta `('C','c','P')` — sin `'p'` —
pero `:416` sí comprueba `('P','p')`. Un ticket con `cab_estado == 'p'` pasa el
filtro, cae en el `else` y se contabiliza como **facturado** en vez de
pendiente.

### I7. Idempotencia por upsert, no por checkpoint

No hay estado persistente. Cada ciclo reprocesa el día completo y la
idempotencia la da el upsert:

```python
f"{self.url}/rest/v1/{table}?on_conflict={on_conflict}"
headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
```

| Tabla | `on_conflict` | Constraint |
|---|---|---|
| `ventas_resumen_diario` | `local_id,fecha,turno` | `unique_resumen_local_fecha_turno` |
| `ventas_por_hora` | `local_id,fecha,hora` | `unique_ventas_hora_local_fecha_hora` |
| `locales` | `id` | PK |
| `productos` | `codigo` | PK |

⚠ **Si el constraint falta, PostgREST devuelve 409 y `upload_in_batches`
descarta el lote.** Un `logger.error` y sigue. Para cambiar el `on_conflict`,
actualiza también la migración (skill `supabase-migration`).

### I8. Codificación y separador

`encoding='cp1252'`, `char_decode_errors='replace'`, `ignore_missing_memofile=True`
— repetidos en 4 puntos de construcción de `OptimizedDBF` (`:278`, `:360`,
`:484`, `:528`). Extrae un factory `open_dbf(path)`.

`sep == b' '` está hardcodeado (`:72`, `:203`): asume dBase III. Otro formato
de TPV rompe el parseo.

`iter_range()` **no replica la lógica de registros borrados** de
`dbfread.__iter__`. Puede incluir tickets marcados como borrados.

---

## Reglas al escribir código aquí

### Red

```python
# ❌ Sin timeout: si Supabase se cuelga, el agente se bloquea para siempre
with urllib.request.urlopen(req) as resp: ...

# ✅
with urllib.request.urlopen(req, timeout=30) as resp: ...
```

- **Toda** llamada `urlopen` lleva `timeout=`. Hoy solo la de ipify lo tiene.
- Implementa reintentos con backoff exponencial y jitter.
- **Re-encola los lotes fallidos**, no los descartes.
- Ejecuta en paralelo los dos extractores si el tiempo lo permite.

### Dinero

```python
from decimal import Decimal, ROUND_HALF_UP
# ❌ float + round()  → redondeo en binario, céntimos que no cuadran
# ✅ Decimal con cuantización explícita a 2 decimales
```

`decimal` ya está importado. Úsalo para aritmética, no solo para castear.

### Magic numbers

Hoy hay literales sueltos por el fichero: `100` (buffer), `2` (corte del día),
`'diario'` (turno), `'E'` (efectivo), `('C','c','P','p')` (estados), `'cp1252'`,
`200`/`500` (lotes), `'%Y-%m-%d'`.

**Conviértelos en constantes de módulo con nombre.** Es un cambio mecánico, de
riesgo bajo y con valor alto.

### Errores

`except Exception` aparece 16 veces. Aparece en todos sitios y normalmente solo
hace `logger.error`.

- `CustomFieldParser` devuelve `None` en silencio. Si `DET_IMPORT` falla al
  parsearse, el agregado lo trata como `0.00` **sin ningún aviso**: las ventas
  se infra-reportan en silencio. Es el fallo más caro del fichero.
- `main()` devuelve código 0 siempre, porque el retorno de
  `run_date_sync()` / `run_historical_upload()` se ignora. Impide usar
  Task Scheduler, CI o un health check.
- Faltan `timeout`, reintentos y propagación del código de salida.

### Logging

`logging.basicConfig()` en el import (`:16-20`) impide usar el módulo como
librería. Los mensajes llevan emojis (`✓`, `✗`) y no son parseables por
agregadores. Sin contexto de `local_id` ni de duración.

---

## Antes de dar un cambio por bueno

- [ ] ¿Sigue compilando? `python -c "import sync_agent"`
- [ ] ¿El `--mode sync` produce el mismo resultado en un día ya sincronizado?
      (idempotencia)
- [ ] ¿Se mantienen sincronizados `extract_metrics` y `extract_all`?
- [ ] ¿He tocado una línea que existe en ambos extractores?
- [ ] ¿Alguna llamada a Supabase nueva lleva `timeout=`?
- [ ] ¿He usado `Decimal` para importes?
- [ ] ¿He dejado algún `any`/número mágico sin nombrar?
- [ ] ¿El agente sigue funcionando **sin red** sin colgarse?
- [ ] ¿He verificado el orden del DBF antes de confiar en la búsqueda binaria?

> Este proyecto **no tiene tests**. Si has tocado el cálculo del día comercial,
> del emparejado entrada/salida o del corte de turno, verifica a mano con casos
> límite (ticket a las 01:59, a las 02:01, turno de 20 h, turno que cruza
  medianoche) y dilo explícitamente.

---

## Referencias

- `references/dbf-fields.md` — mapa de campos DBF → columnas, y qué formato
  espera cada uno.
