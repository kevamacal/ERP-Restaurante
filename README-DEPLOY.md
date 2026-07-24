# Despliegue y configuración para ERP-Restaurante

## 1. Uso de datos locales (`datos`)

El repositorio clonado no incluye los datos DBF dentro de `ERP-Restaurante`. Debes usar la carpeta local `c:\Numier\datos`.

### Scripts principales

- `conversion_dbf_sqlite.py`
  - Por defecto usa `../datos` como carpeta de entrada.
  - Convierte todos los archivos `.DBF` en `datos` a una base SQLite `base_datos.db`.
  - Uso:
    ```powershell
    cd c:\Numier\ERP-Restaurante
    python conversion_dbf_sqlite.py
    ```

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

### `vercel.json`

Se agregó `vercel.json` para que Vercel use el package.json correcto:

```json
{
  "version": 3,
  "builds": [
    {
      "src": "ERP-Restaurante/pwa/package.json",
      "use": "@vercel/static-build"
    }
  ]
}
```

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
