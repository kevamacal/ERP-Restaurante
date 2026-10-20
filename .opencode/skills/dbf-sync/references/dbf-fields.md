# Campos DBF y su correspondencia

Mapa de los campos que el agente lee de los ficheros del TPV, dónde se usan y
qué formato se espera. Todos los usos están verificados con `grep`.

> ⚠ El TPV es un sistema heredado: **la estructura de estos ficheros no está
> documentada en ningún sitio** y no hay fichero de test. Todo lo de abajo está
> deducido del código. Si añades un campo, verifica el formato real contra un
> fichero de producción antes de confiar en él.

---

## Ficheros esperados

El agente abre rutas fijas y **con mayúsculas**:

```python
cabecera_path = os.path.join(dbf_dir, "cabecera.DBF")
detalle_path  = os.path.join(dbf_dir, "detalle.DBF")
```

En Linux o macOS, un `.dbf` en minúsculas rompe el agente. En Windows no hay
problema, que es donde corre.

---

## `cabecera.DBF` — una fila por ticket

| Campo | Uso | Dónde | Formato esperado |
|---|---|---|---|
| `CAB_FECHA` | Fecha del ticket, y **clave de la búsqueda binaria** | `:89, 124, 290, 299, 499` | `parse_dbf_date()` acepta varios formatos (ver abajo) |
| `CAB_ID` | Referencia para cruzarse con `detalle.DBF` | `:332, 385, 497` | Entero |
| `CAB_HORA` | Hora → define el **día comercial** | `:312, 501` | Ver `parse_dbf_hour()` abajo |
| `CAB_ESTADO` | Cerrado (`C`/`c`) vs pendiente (`P`/`p`) | `:309, 416, 495` | Char. ⚠ Compara **sin normalizar a mayúsculas** |
| `CAB_COBRO` | Forma de pago; `'E'` = efectivo | `:333, 421, 523` | Char |

### `CAB_FECHA` — formatos que acepta `parse_dbf_date()` (`:45-57`)

`dbfread` devuelve `datetime.date` si el campo tiene el tipo fecha de dBase, y
`str` si no. La función normaliza ambos. Si el TPV usa un formato que no está en
la lista, devuelve `None` y **el ticket se pierde sin aviso**.

### `CAB_HORA` — parseo (`:312-323` y `:501-512`)

12 líneas duplicadas literalmente. Extrae `parse_dbf_hour()`. Devuelve la hora
como entero para poder aplicar el corte de las 02:00.

⚠ Asume `HH:MM` o `HH:MM:SS`. No maneja formato `HHMMSS` numérico sin
transformar.

---

## `detalle.DBF` — una fila por línea de ticket

| Campo | Uso | Dónde | Formato esperado |
|---|---|---|---|
| `DET_ID` | **Clave de la segunda búsqueda binaria** | `:376, 383, 544` | Entero, orden ascendente obligatorio |
| `CAB_ID` | Cruzamiento con `cabecera.DBF` | `:385` | Debe coincidir con `cabecera.CAB_ID` |
| `DET_IMPORT` | Importe de la línea | `:391, 546` | ⚠ Numérico |

### ⚠ `DET_IMPORT` es el punto más frágil

`CustomFieldParser` (`:37-43`) captura **cualquier** excepción de parseo y
devuelve `None` sin registrar nada. Después, el agregado hace
`(importe or 0.0)`.

**Resultado: si `DET_IMPORT` falla al parsearse, esa línea cuenta como 0,00 € y
no hay ningún aviso.** Las ventas se infra-reportan en silencio. Es el fallo
más caro del agente y el más difícil de detectar.

Antes de tocar el parseo de importes, añade un contador de `None` y loguéalo.

---

## `articulos.DBF` — solo en `sync_productos.py`

| Campo | Uso | Dónde |
|---|---|---|
| `ART_CODIGO` | Clave de upsert | `:129` |
| `ART_DESCRI` | Descripción | `:130` |
| `ART_GRUPO` | Categoría | `:136` |
| `ART_TVENT` | PVP / precio de venta | `:140, 141` |
| `ART_BAJA` | Marca de baja | `:160` |
| `ART_LARGA` | Descripción larga | `:163` |
| `ART_IMAGEN` | Ruta de imagen | `:169` |

Categoría por defecto: `'Otros'` (`:137`).

---

## Orden del fichero: requisito duro

`find_first_index_by_date()` y `find_first_index_by_id()` hacen búsqueda
binaria. **Solo son correctas si `CAB_FECHA` y `DET_ID` están en orden
ascendente.**

Nada en el código lo verifica. Antes de confiar en ellas, compruébalo sobre el
fichero real:

```python
import dbfread
db = dbfread.DBF('cabecera.DBF', load=True, parserclass=CustomFieldParser)
fechas = [r['CAB_FECHA'] for r in db]
print('ordenado:', all(a <= b for a, b in zip(fechas, fechas[1:])))
```

Si no está ordenado, o el TPV inserta fuera de orden a veces, la búsqueda
binaria devuelve un índice **erróneo** y el agente sube datos incorrectos sin
avisar. En ese caso, cae a barrido secuencial (O(N)) o verifica el orden y
corrige.

---

## Offset: el cálculo

```python
start_offset = self.header.headerlen + idx * self.header.recordlen
```

- `headerlen` — bytes de cabecera, fijo por fichero.
- `recordlen` — bytes por registro, fijo por fichero.
- El separador de fin de registro es `b' '` (dBase III), asumido, no detectado
  (`:72`, `:203`).

---

## Referencias cruzadas

- `sync_agent.py:397-461` — agregación de `ventas_resumen_diario`
- `sync_agent.py:553-609` — agregación histórica, **esquema distinto**
- `sync_agent.py:418-449` — cómo se calcula `total_pendiente`

⚠ `extract_metrics` genera `total_pendiente` y acepta estados pendientes;
`extract_all` no genera ese campo y solo acepta cerrados. Como el upsert usa
`resolution=merge-duplicates`, una fila creada por el sync diario y sobrescrita
por el histórico **conserva un `total_pendiente` obsoleto**.
