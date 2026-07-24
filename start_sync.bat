@echo off
REM Script para arrancar la sincronización una vez al iniciar Windows
set "SUPABASE_URL=https://iljbfckwqlklradypkyu.supabase.co"
set "SUPABASE_KEY=sb_publishable_l_x6DsLXVd-Ul_TycUGsLQ_Jokti1G2"
cd /d "%~dp0"
python sync_agent.py --dbf-dir "..\datos" --local-id local_1
