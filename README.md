# ERP-Restaurante 🍽️

[![React 19](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-emerald.svg)](https://supabase.com/)
[![Tailwind CSS 4.0](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)

Un sistema full-stack de control de negocio y sincronización en tiempo real diseñado para el sector de la restauración. Permite conectar un **TPV físico local** (que opera de forma tradicional con bases de datos heredadas tipo FoxPro/DBF) con una base de datos en la nube (**Supabase/PostgreSQL**) para alimentar tanto un **Panel Administrativo PWA** como una **Carta Digital Interactiva** accesible por los clientes.

---

## 🏗️ Arquitectura del Sistema

El sistema implementa una arquitectura híbrida híbrida local-nube para garantizar la resiliencia y velocidad del negocio:

```mermaid
graph TD
    subgraph Entorno Local (Restaurante)
        TPV[TPV Físico Numier] -- Genera --> DBF[(Archivos .DBF)]
        Agent[Agente Sync - Python] -- Lee eficientemente --> DBF
        Agent -- Detecta --> IP[IP Pública Local]
    end

    subgraph Nube (Backend & DB)
        Supa[(Supabase / PostgreSQL)]
        RPC[Función RPC - Verify PIN]
    end

    subgraph Clientes & Administración (Frontend)
        PWA[Panel Admin PWA - React 19] -- Consume / Ficha --> Supa
        PWA -- Verifica PIN --> RPC
        Web[Carta Digital - TanStack Start] -- Consume --> Supa
    end

    Agent -- Sincronización Batch HTTPS --> Supa
    Agent -- Actualiza IP Pública --> Supa
```

---

## 🚀 Módulos Principales

### 1. Agente de Sincronización Local (`sync_agent.py` & `sync_productos.py`)
Es un servicio en Python optimizado para ejecutarse en segundo plano en el servidor local del restaurante.
*   **Sincronización Incremental de Ventas**: Lee y procesa las ventas diarias de `cabecera.DBF` y `detalle.DBF`, calculando en tiempo real las métricas de facturación por turno y por horas.
*   **Sincronización de Carta / Productos**: Lee `articulos.DBF` para actualizar la base de datos de productos en la nube, gestionando tarifas complejas (Tapa vs. Plato/Ración) y categorías de menú.
*   **Reporte de Conectividad**: Detecta periódicamente la IP pública local del restaurante y la reporta a Supabase para facilitar la administración remota.
*   **Gestión por lotes (Batching)**: Agrupa registros en bloques (chunks) para reducir la latencia de las peticiones HTTP y prevenir límites de rate-limiting en la API.

### 2. Panel Administrativo PWA (`pwa/`)
Una aplicación web progresiva (PWA) instalable en móviles y tablets, pensada para la gerencia del restaurante.
*   **Visualización de Métricas**: Gráficos interactivos de facturación horaria e histórica de ventas por turno mediante **Recharts**.
*   **Control Horario de Personal**: Interfaz simplificada para el fichaje de empleados (Entrada/Salida) con cálculo del coste por hora en tiempo real.
*   **Seguridad**: Autenticación de acciones críticas (como administración de personal) mediante un teclado PIN protegido por funciones RPC en el servidor de base de datos.
*   **PWA Nativa**: Soporte para instalación de escritorio/pantalla de inicio y funcionamiento offline básico mediante *Service Workers*.

---

## 🛠️ Desafíos Técnicos e Ingeniería de Alto Rendimiento

### ⚡ Búsqueda Binaria Directa sobre Archivos DBF ($O(\log N)$)
Los archivos de base de datos FoxPro/DBF (`detalle.DBF`) crecen rápidamente, alcanzando cientos de miles de registros de venta. Cargar todo el archivo en memoria o hacer un escaneo secuencial $O(N)$ en cada ciclo de sincronización ralentizaba el servidor del TPV.

*   **Solución**: Se implementó la clase `OptimizedDBF` extendiendo la biblioteca `dbfread`. Al conocer la longitud fija de los registros definida en la cabecera del archivo DBF, el agente calcula la dirección en bytes del registro medio y realiza un `seek()` directo.
*   Esto permite realizar **búsquedas binarias ($O(\log N)$) sobre el archivo físico** para encontrar instantáneamente los registros asociados a una fecha o rango de IDs específico en milisegundos.

```python
# Ejemplo conceptual del cálculo de offset para lectura directa en disco
start_offset = self.header.headerlen + idx * self.header.recordlen
infile.seek(start_offset, 0)
```

### 🕒 Lógica de Turno Comercial Nocturno
En restauración, las ventas pasadas las 12:00 AM (medianoche) pertenecen comercialmente al día de apertura anterior (el "servicio de cena"). 
*   **Solución**: El agente implementa un umbral de corte temporal a las **2:00 AM**. Las ventas registradas entre las 00:00 y las 01:59 se desplazan de manera inteligente a la jornada comercial del día natural anterior, previniendo descuadres en los cierres de caja.

---

## 📊 Diseño de la Base de Datos (Supabase)

El esquema relacional diseñado para soportar toda la operación del sistema consta de las siguientes tablas clave:

```sql
-- Locales: Permite múltiples sucursales con control de IP y PIN de administración
CREATE TABLE locales (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    ip_publica TEXT,
    pin_admin TEXT DEFAULT '1234'
);

-- Empleados: Almacena datos del personal y coste operativo para cálculo de rentabilidad
CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT REFERENCES locales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    pin_empleado TEXT DEFAULT '0000',
    coste_hora NUMERIC(10, 2) DEFAULT 10.00,
    activo BOOLEAN DEFAULT true
);

-- Fichajes: Registro histórico de entradas y salidas de jornada
CREATE TABLE fichajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('entrada', 'salida')),
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Productos: Soportando precios variables y descripciones completas
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    precio_tapa NUMERIC(10, 2),
    precio_plato NUMERIC(10, 2),
    activo BOOLEAN DEFAULT true,
    caracteristicas TEXT,
    imagen_url TEXT
);
```

---

## ⚙️ Instalación y Configuración

### 1. Requisitos previos
*   Python 3.10 o superior instalado.
*   Node.js 18 o superior y npm.
*   Un proyecto activo en Supabase.

### 2. Configuración del Agente de Sincronización
1.  Navega a la raíz del repositorio y crea un archivo `.env`:
    ```env
    SUPABASE_URL=https://tu-proyecto.supabase.co
    SUPABASE_KEY=tu-service-role-key-de-supabase
    ```
2.  Crea un entorno virtual e instala las dependencias:
    ```bash
    python -m venv venv
    source venv/bin/activate # En Windows: venv\Scripts\activate
    pip install dbfread
    ```
3.  Ejecuta la sincronización de la base de datos de productos:
    ```bash
    python sync_productos.py
    ```
4.  Lanza el agente de sincronización continua de ventas (ej. cada 10 minutos):
    ```bash
    python sync_agent.py --mode sync --dbf-dir ./archivos --local-id mi_local_1 --interval 600
    ```

### 3. Configuración del Frontend Administrativo (PWA)
1.  Dirígete a la carpeta `pwa/` y crea su respectivo archivo `.env`:
    ```bash
    cd pwa
    # Crea .env con:
    # VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
    # VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
    ```
2.  Instala las dependencias y corre el servidor de desarrollo:
    ```bash
    npm install
    npm run dev
    ```
