# Despliegue y configuración para ERP-Restaurante

## 1. Uso de datos locales (`datos`)

El repositorio clonado no incluye los datos DBF dentro de `ERP-Restaurante`. Debes usar la carpeta local de datos que presente el dispositivo.

### Scripts principales

Este script ha sido realizado tomando como base un dispositivo cuyo sistema de gestión empleado es Numier. En caso de tener otro sistema de gestión, deberás contactar al administrador para que te otorgue un script correspondiente a dicho sistema.

- `sync_agent.py`
  - Por defecto usa `../datos` como directorio DBF.
  - Lee `cabecera.DBF` y `detalle.DBF` para calcular métricas diarias.
  - Envío a Supabase con variables de entorno o pasando `--supabase-url` y `--supabase-key`.
  - Uso:
    ```powershell
    cd c:\Numier\ERP-Restaurante
    python sync_agent.py --dbf-dir ..\datos --supabase-url <URL> --supabase-key <KEY>
    ```

## 2. Configuración de frontend y Vercel

La app React se encuentra en `ERP-Restaurante/pwa`.

### Variables de entorno para Vercel

Define estas variables en el panel de Vercel (`Project Settings > Environment Variables`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Configuración de `package.json`

El frontend usa:

- `npm run build` → `tsc -b && vite build`
- `npm run dev` → `vite`

### Variables de entorno para el agente Python

`sync_agent.py` carga automáticamente `.env` desde su propio directorio. Copia
`.env.example` a `.env` en la raíz del repo (ese fichero está ignorado por git) y
rellena:

- `SUPABASE_URL`
- `SUPABASE_KEY`

`start_sync.bat` ya no contiene credenciales: solo arranca el agente.

### OCR de facturas (Edge Function)

La clave de Gemini es un secreto de servidor, nunca una variable `VITE_*`:

```bash
cd pwa
npx supabase login
npx supabase secrets set GEMINI_API_KEY=tu-clave --project-ref iljbfckwqlklradypkyu
npx supabase functions deploy analyze-invoice --project-ref iljbfckwqlklradypkyu
```

Secretos opcionales: `GEMINI_MODEL` (por defecto `gemini-3.5-flash-lite`) y
`ALLOWED_ORIGIN` (por defecto `*`; en producción pon el dominio de Vercel para
restringir CORS).

La función `analyze-invoice` exige sesión de Supabase (`verify_jwt`), valida el
tipo y tamaño del archivo, y normaliza la respuesta antes de devolverla. En
Vercel **no** hay que configurar ninguna clave de Gemini; si existe una
`VITE_GEMINI_API_KEY` antigua, bórrala y **revoca la clave en Google AI Studio**
(la anterior estuvo expuesta en el bundle).

## 3. Pasos recomendados

1. Instalar dependencias en `ERP-Restaurante/pwa`:
   ```powershell
   cd c:\Numier\ERP-Restaurante\pwa
   npm install
   ```
2. Probar localmente:
   ```powershell
   npm run dev
   ```
3. Subir a Vercel y configurar variables de entorno.

## 4. Notas importantes

- El backend/TPV no está desplegado en Vercel: solo se despliega la app React.
- El frontend consume datos desde Supabase, por lo que necesitas un proyecto Supabase con tablas `locales`, `ventas_resumen_diario` y `ventas_por_hora`.
- El script `upload_all_to_supabase.py` sirve para sincronizar datos históricos desde `base_datos.db`.
- Si Vercel despliega desde el root del repositorio, usa el archivo `vercel.json` en la raíz para apuntar al subdirectorio `ERP-Restaurante/pwa`.
