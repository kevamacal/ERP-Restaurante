import os
import time
import datetime
import decimal
import argparse
import json
import urllib.request
import urllib.parse
from dbfread import DBF, FieldParser

class CustomFieldParser(FieldParser):
    def parse(self, field, data):
        try:
            return super().parse(field, data)
        except Exception:
            return None

def extract_shift_metrics(dbf_dir, target_date=None):
    """
    Lee cabecera.DBF y detalle.DBF del TPV local y calcula
    las métricas de ingresos agrupando por TURNO/CIERRE.
    """
    if target_date is None:
        target_date = datetime.date.today()
    elif isinstance(target_date, str):
        target_date = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()

    cabecera_path = os.path.join(dbf_dir, "cabecera.DBF")
    detalle_path = os.path.join(dbf_dir, "detalle.DBF")

    if not os.path.exists(cabecera_path) or not os.path.exists(detalle_path):
        raise FileNotFoundError(f"No se encontraron cabecera.DBF y/o detalle.DBF en {dbf_dir}")

    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Analizando TPV local por turnos para fecha: {target_date}")
    t0 = time.time()

    cabecera_table = DBF(
        cabecera_path,
        load=False,
        encoding='cp1252',
        ignore_missing_memofile=True,
        char_decode_errors='replace',
        parserclass=CustomFieldParser
    )

    # 1. Agrupar tickets de cabecera por ID de ticket e identificar su turno
    today_tickets = {} # cab_id -> {'tipo_cobro': 'E'/'T', 'hora': int, 'turno': str/int}
    for record in cabecera_table:
        f_fecha = record.get('CAB_FECHA')
        f_estado = record.get('CAB_ESTADO')

        if f_fecha == target_date and f_estado == 'C':
            cab_id = record.get('CAB_ID')
            tipo_cobro = record.get('CAB_COBRO', 'E')
            hora_raw = record.get('CAB_HORA')

            # Buscar campo de turno en Numier (CAB_TURNO / CAB_CIERRE / CAB_Z)
            # Si no existe, clasifica por rango horario: 'comida' (<18h) o 'cena' (>=18h)
            turno_raw = record.get('CAB_TURNO') or record.get('CAB_CIERRE') or record.get('CAB_Z')
            
            hora_num = 0
            if isinstance(hora_raw, (datetime.datetime, datetime.time)):
                hora_num = hora_raw.hour

            if not turno_raw:
                turno_str = "comida" if hora_num < 18 else "cena"
            else:
                turno_str = str(turno_raw).strip()

            if cab_id is not None:
                today_tickets[cab_id] = {
                    'tipo_cobro': tipo_cobro,
                    'hora': hora_num,
                    'turno': turno_str
                }

    print(f"  -> Encontrados {len(today_tickets):,} tickets cerrados.")

    # 2. Leer detalle.DBF y sumar montos por ticket
    ticket_totals = {}
    if today_tickets:
        detalle_table = DBF(
            detalle_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )

        for record in detalle_table:
            cab_id = record.get('DET_ID')
            if cab_id in today_tickets:
                importe = record.get('DET_IMPORT', 0.0)
                if isinstance(importe, decimal.Decimal):
                    importe = float(importe)
                ticket_totals[cab_id] = ticket_totals.get(cab_id, 0.0) + (importe or 0.0)

    # 3. Consolidar métricas AGRUPANDO POR TURNO
    turnos_dict = {} # turno -> dict de métricas
    horas_dict = {}

    for cab_id, meta in today_tickets.items():
        monto = ticket_totals.get(cab_id, 0.0)
        t_id = meta['turno']
        
        # Agrupación por Turno
        if t_id not in turnos_dict:
            turnos_dict[t_id] = {
                'total_facturado': 0.0,
                'total_efectivo': 0.0,
                'total_tarjeta': 0.0,
                'num_tickets': 0
            }

        turnos_dict[t_id]['total_facturado'] += monto
        turnos_dict[t_id]['num_tickets'] += 1
        if meta['tipo_cobro'] == 'E':
            turnos_dict[t_id]['total_efectivo'] += monto
        else:
            turnos_dict[t_id]['total_tarjeta'] += monto

        # Agrupación por Hora
        h = meta['hora']
        if h not in horas_dict:
            horas_dict[h] = {'total_facturado': 0.0, 'num_tickets': 0}
        horas_dict[h]['total_facturado'] += monto
        horas_dict[h]['num_tickets'] += 1

    elapsed = time.time() - t0
    print(f"  -> Procesamiento completado en {elapsed:.2f} segundos.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    resumenes_turnos = []
    for t_id, data in turnos_dict.items():
        resumenes_turnos.append({
            'fecha': target_date.strftime("%Y-%m-%d"),
            'turno': t_id,
            'total_facturado': round(data['total_facturado'], 2),
            'num_tickets': data['num_tickets'],
            'total_efectivo': round(data['total_efectivo'], 2),
            'total_tarjeta': round(data['total_tarjeta'], 2),
            'ultima_actualizacion': now_iso
        })

    desglose_horas = []
    for h in sorted(horas_dict.keys()):
        desglose_horas.append({
            'fecha': target_date.strftime("%Y-%m-%d"),
            'hora': h,
            'total_facturado': round(horas_dict[h]['total_facturado'], 2),
            'num_tickets': horas_dict[h]['num_tickets'],
            'ultima_actualizacion': now_iso
        })

    return resumenes_turnos, desglose_horas

def send_to_supabase(url, apikey, local_id, resumenes_turnos, desglose_horas):
    """
    Envía las métricas a Supabase.
    """
    headers = {
        "apikey": apikey,
        "Authorization": f"Bearer {apikey}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # 1. Upsert Resumen por Turno (on_conflict ajustado a local_id,fecha,turno)
    if resumenes_turnos:
        turnos_payload = [{**t, "local_id": local_id} for t in resumenes_turnos]
        resumen_url = f"{url.rstrip('/')}/rest/v1/ventas_resumen_diario?on_conflict=local_id,fecha,turno"
        
        req = urllib.request.Request(
            resumen_url,
            data=json.dumps(turnos_payload).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  ✓ {len(resumenes_turnos)} turnos enviados correctamente a Supabase.")
        except Exception as e:
            print(f"  ✗ Error al enviar resúmenes por turno: {e}")

    # 2. Upsert Desglose por Hora
    if desglose_horas:
        horas_payload = [{**h, "local_id": local_id} for h in desglose_horas]
        horas_url = f"{url.rstrip('/')}/rest/v1/ventas_por_hora?on_conflict=local_id,fecha,hora"
        
        req_h = urllib.request.Request(
            horas_url,
            data=json.dumps(horas_payload).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req_h) as resp:
                print("  ✓ Desglose por hora enviado correctamente a Supabase.")
        except Exception as e:
            print(f"  ✗ Error al enviar desglose por hora: {e}")

def run_sync(dbf_dir, local_id, url=None, key=None, target_date=None):
    turnos, horas = extract_shift_metrics(dbf_dir, target_date=target_date)
    for t in turnos:
        print(f"Turno '{t['turno']}' [{local_id}]: Total: {t['total_facturado']}€ | Tickets: {t['num_tickets']} | Efectivo: {t['total_efectivo']}€ | Tarjeta: {t['total_tarjeta']}€")
    
    if url and key:
        print("Enviando métricas a Supabase...")
        send_to_supabase(url, key, local_id, turnos, horas)
    else:
        print("Nota: Modo de prueba (no se indicaron --supabase-url ni --supabase-key).")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Agente de sincronización local TPV -> Supabase por Turnos")
    parser.add_argument("--dbf-dir", default="../datos", help="Directorio con cabecera.DBF y detalle.DBF")
    parser.add_argument("--local-id", default="local_1", help="ID único del local")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="URL del proyecto Supabase")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_KEY"), help="API Key de Supabase")
    parser.add_argument("--date", default=None, help="Fecha YYYY-MM-DD")
    parser.add_argument("--interval", type=int, default=0, help="Intervalo de ejecución continua (0 = una vez)")

    args = parser.parse_args()

    if args.interval > 0:
        print(f"Iniciando servicio de sincronización por turnos para '{args.local_id}' cada {args.interval} segundos.")
        while True:
            try:
                run_sync(args.dbf_dir, args.local_id, args.supabase_url, args.supabase_key, args.date)
            except Exception as e:
                print(f"Error en sincronización: {e}")
            time.sleep(args.interval)
    else:
        run_sync(args.dbf_dir, args.local_id, args.supabase_url, args.supabase_key, args.date)