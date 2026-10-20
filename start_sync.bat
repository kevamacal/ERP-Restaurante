@echo off
REM Arranca la sincronización una vez al iniciar Windows.
REM Las credenciales NO van en este fichero: sync_agent.py carga .env desde
REM este mismo directorio (no versionado). Copia .env.example a .env y rellénalo.
cd /d "%~dp0"

if not exist ".env" (
  echo [ERROR] No existe .env junto a este script.
  echo Copia .env.example a .env y configura SUPABASE_URL y SUPABASE_KEY.
  exit /b 1
)

python sync_agent.py --dbf-dir "..\datos" --local-id local_1
