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

def extract_daily_metrics(dbf_dir, target_date=None):
    """
    Lee cabecera.DBF y detalle.DBF del directorio de la TPV local
    y calcula las métricas de ingresos para la fecha seleccionada.
    Optimizado: Solo suma los detalles pertenecientes a los tickets del día objetivo.
    """
    if target_date is None:
        target_date = datetime.date.today()
    elif isinstance(target_date, str):
        target_date = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()

    cabecera_path = os.path.join(dbf_dir, "cabecera.DBF")
    detalle_path = os.path.join(dbf_dir, "detalle.DBF")

    if not os.path.exists(cabecera_path) or not os.path.exists(detalle_path):
        raise FileNotFoundError(f"No se encontraron cabecera.DBF y/o detalle.DBF en {dbf_dir}")

    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Analizando TPV local para la fecha: {target_date}")
    t0 = time.time()

    # 1. Leer primero cabecera.DBF (93MB) para obtener los IDs del día objetivo
    cabecera_table = DBF(
        cabecera_path,
        load=False,
        encoding='cp1252',
        ignore_missing_memofile=True,
        char_decode_errors='replace',
        parserclass=CustomFieldParser
    )

    today_tickets = {} # cab_id -> {'tipo_cobro': 'E'/'T', 'hora': 0..23}
    for record in cabecera_table:
        f_fecha = record.get('CAB_FECHA')
        f_estado = record.get('CAB_ESTADO')

        if f_fecha == target_date and f_estado == 'C':
            cab_id = record.get('CAB_ID')
            tipo_cobro = record.get('CAB_COBRO', 'E')
            hora_raw = record.get('CAB_HORA')

            hora_num = 0
            if isinstance(hora_raw, (datetime.datetime, datetime.time)):
                hora_num = hora_raw.hour

            if cab_id is not None:
                today_tickets[cab_id] = {
                    'tipo_cobro': tipo_cobro,
                    'hora': hora_num
                }

    print(f"  -> Encontrados {len(today_tickets):,} tickets cerrados para el día {target_date}.")

    # 2. Leer detalle.DBF (1.5GB) y procesar ÚNICAMENTE los registros pertenecientes a today_tickets
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

    # 3. Consolidar métricas
    total_facturado = 0.0
    total_efectivo = 0.0
    total_tarjeta = 0.0
    num_tickets = len(today_tickets)
    horas_dict = {}

    for cab_id, meta in today_tickets.items():
        monto = ticket_totals.get(cab_id, 0.0)
        total_facturado += monto

        if meta['tipo_cobro'] == 'E':
            total_efectivo += monto
        else:
            total_tarjeta += monto

        h = meta['hora']
        if h not in horas_dict:
            horas_dict[h] = {'total_facturado': 0.0, 'num_tickets': 0}
        horas_dict[h]['total_facturado'] += monto
        horas_dict[h]['num_tickets'] += 1

    elapsed = time.time() - t0
    print(f"  -> Procesamiento completado en {elapsed:.2f} segundos.")

    resumen_diario = {
        'fecha': target_date.strftime("%Y-%m-%d"),
        'total_facturado': round(total_facturado, 2),
        'num_tickets': num_tickets,
        'total_efectivo': round(total_efectivo, 2),
        'total_tarjeta': round(total_tarjeta, 2),
        'ultima_actualizacion': datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    desglose_horas = []
    for h in sorted(horas_dict.keys()):
        desglose_horas.append({
            'fecha': target_date.strftime("%Y-%m-%d"),
            'hora': h,
            'total_facturado': round(horas_dict[h]['total_facturado'], 2),
            'num_tickets': horas_dict[h]['num_tickets'],
            'ultima_actualizacion': datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    return resumen_diario, desglose_horas

def send_to_supabase(url, apikey, local_id, resumen_diario, desglose_horas):
    """
    Envía los datos a Supabase utilizando la API PostgREST con los parámetros on_conflict requeridos.
    """
    headers = {
        "apikey": apikey,
        "Authorization": f"Bearer {apikey}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # 1. Upsert Resumen Diario
    resumen_payload = {**resumen_diario, "local_id": local_id}
    resumen_url = f"{url.rstrip('/')}/rest/v1/ventas_resumen_diario?on_conflict=local_id,fecha"
    
    req = urllib.request.Request(
        resumen_url,
        data=json.dumps(resumen_payload).encode('utf-8'),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("  ✓ Resumen diario enviado correctamente a Supabase.")
    except Exception as e:
        print(f"  ✗ Error al enviar resumen diario: {e}")

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
    resumen, horas = extract_daily_metrics(dbf_dir, target_date=target_date)
    print(f"Resumen diario [{local_id}]: Total: {resumen['total_facturado']}€ | Tickets: {resumen['num_tickets']} | Efectivo: {resumen['total_efectivo']}€ | Tarjeta: {resumen['total_tarjeta']}€")
    
    if url and key:
        print("Enviando métricas a Supabase...")
        send_to_supabase(url, key, local_id, resumen, horas)
    else:
        print("Nota: Modo de prueba (no se indicaron --supabase-url ni --supabase-key).")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Agente de sincronización local TPV -> Supabase")
    parser.add_argument("--dbf-dir", default="archivos", help="Directorio con cabecera.DBF y detalle.DBF")
    parser.add_argument("--local-id", default="local_1", help="ID único del local (ej: local_1)")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="URL del proyecto Supabase")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_KEY"), help="API Key / Service Role Key de Supabase")
    parser.add_argument("--date", default=None, help="Fecha opcional en formato YYYY-MM-DD (por defecto hoy)")
    parser.add_argument("--interval", type=int, default=0, help="Intervalo en segundos para ejecucion continua (0 = una sola vez)")

    args = parser.parse_args()

    if args.interval > 0:
        print(f"Iniciando servicio de sincronización continua para '{args.local_id}' cada {args.interval} segundos.")
        while True:
            try:
                run_sync(args.dbf_dir, args.local_id, args.supabase_url, args.supabase_key, args.date)
            except Exception as e:
                print(f"Error en sincronización: {e}")
            time.sleep(args.interval)
    else:
        run_sync(args.dbf_dir, args.local_id, args.supabase_url, args.supabase_key, args.date)
