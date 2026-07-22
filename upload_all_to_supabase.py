import sqlite3
import json
import urllib.request
import time
import os

SUPABASE_URL = "https://iljbfckwqlklradypkyu.supabase.co"
SUPABASE_KEY = "sb_publishable_l_x6DsLXVd-Ul_TycUGsLQ_Jokti1G2"
LOCAL_ID = "local_1"
DB_PATH = "base_datos.db"

def upload_in_batches(endpoint, data_list, on_conflict_param, batch_size=500):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint}?on_conflict={on_conflict_param}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    total = len(data_list)
    print(f"Subiendo {total:,} registros a Supabase tabla '{endpoint}' (on_conflict={on_conflict_param})...")

    for i in range(0, total, batch_size):
        chunk = data_list[i:i + batch_size]
        req = urllib.request.Request(
            url,
            data=json.dumps(chunk).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                pass
            print(f"  ✓ {min(i + batch_size, total):,} / {total:,} en '{endpoint}'")
        except Exception as e:
            print(f"  ✗ Error en lote {i}: {e}")
            if hasattr(e, 'read'):
                print("    Detalle:", e.read().decode('utf-8'))
            time.sleep(1)

def extract_and_seed():
    print(f"Abriendo {DB_PATH} para extraer todo el histórico de ventas...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Extraer resúmenes diarios
    print("Calculando resúmenes diarios...")
    query_diarios = """
    SELECT 
        c.CAB_FECHA as fecha,
        ROUND(SUM(d.DET_IMPORT), 2) as total_facturado,
        COUNT(DISTINCT c.CAB_ID) as num_tickets,
        ROUND(SUM(CASE WHEN c.CAB_COBRO = 'E' THEN d.DET_IMPORT ELSE 0 END), 2) as total_efectivo,
        ROUND(SUM(CASE WHEN c.CAB_COBRO != 'E' THEN d.DET_IMPORT ELSE 0 END), 2) as total_tarjeta
    FROM cabecera c
    JOIN detalle d ON c.CAB_ID = d.DET_ID
    WHERE c.CAB_ESTADO = 'C' AND c.CAB_FECHA IS NOT NULL
    GROUP BY c.CAB_FECHA
    ORDER BY c.CAB_FECHA DESC;
    """
    cursor.execute(query_diarios)
    rows_diarios = cursor.fetchall()

    diarios_list = []
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    for r in rows_diarios:
        diarios_list.append({
            "local_id": LOCAL_ID,
            "fecha": r[0],
            "total_facturado": float(r[1] or 0.0),
            "num_tickets": int(r[2] or 0),
            "total_efectivo": float(r[3] or 0.0),
            "total_tarjeta": float(r[4] or 0.0),
            "ultima_actualizacion": now_iso
        })

    print(f"Se generaron {len(diarios_list):,} días de resumen histórico.")

    # 2. Extraer desglose por hora
    print("Calculando desglose por hora...")
    query_horas = """
    SELECT 
        c.CAB_FECHA as fecha,
        CAST(strftime('%H', c.CAB_HORA) AS INTEGER) as hora,
        ROUND(SUM(d.DET_IMPORT), 2) as total_facturado,
        COUNT(DISTINCT c.CAB_ID) as num_tickets
    FROM cabecera c
    JOIN detalle d ON c.CAB_ID = d.DET_ID
    WHERE c.CAB_ESTADO = 'C' AND c.CAB_FECHA IS NOT NULL AND c.CAB_HORA IS NOT NULL
    GROUP BY c.CAB_FECHA, hora
    ORDER BY c.CAB_FECHA DESC, hora ASC;
    """
    cursor.execute(query_horas)
    rows_horas = cursor.fetchall()

    horas_list = []
    for r in rows_horas:
        if r[1] is not None and 0 <= r[1] <= 23:
            horas_list.append({
                "local_id": LOCAL_ID,
                "fecha": r[0],
                "hora": int(r[1]),
                "total_facturado": float(r[2] or 0.0),
                "num_tickets": int(r[3] or 0),
                "ultima_actualizacion": now_iso
            })

    print(f"Se generaron {len(horas_list):,} registros horaria históricos.")
    conn.close()

    # Subir a Supabase con los parámetros on_conflict requeridos por PostgREST
    upload_in_batches("ventas_resumen_diario", diarios_list, "local_id,fecha", batch_size=200)
    upload_in_batches("ventas_por_hora", horas_list, "local_id,fecha,hora", batch_size=500)

    print("\n¡SUBIDA Y CORRECCIÓN DE SUPABASE COMPLETADA CON ÉXITO!")

if __name__ == '__main__':
    extract_and_seed()
