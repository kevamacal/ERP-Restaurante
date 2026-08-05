import os
import sys
import time
import json
import datetime
import decimal
import sqlite3
import argparse
import logging
from typing import Dict, List, Any, Tuple, Optional
import urllib.request
import urllib.parse
from dbfread import DBF, FieldParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("SyncAgent")

def load_env(env_path: str = ".env") -> None:
    """Loads environment variables from a .env file if it exists."""
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip()
            logger.info("Loaded configuration from .env file.")
        except Exception as e:
            logger.warning(f"Could not read .env file: {e}")

class CustomFieldParser(FieldParser):
    """Custom DBF field parser that ignores conversion errors and returns None instead."""
    def parse(self, field, data):
        try:
            return super().parse(field, data)
        except Exception:
            return None

def parse_dbf_date(f_fecha: Any) -> Optional[datetime.date]:
    """Helper to parse a DBF date field into a datetime.date object."""
    if isinstance(f_fecha, datetime.date):
        return f_fecha
    if isinstance(f_fecha, datetime.datetime):
        return f_fecha.date()
    if isinstance(f_fecha, str):
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.datetime.strptime(f_fecha.strip(), fmt).date()
            except ValueError:
                pass
    return None

class OptimizedDBF(DBF):
    """Extends dbfread.DBF with high-performance binary search and range reading capabilities."""
    
    def read_single_record(self, idx: int, memofile=None) -> Optional[Dict[str, Any]]:
        """Reads and parses a single record at the given 0-based index."""
        if idx < 0 or idx >= self.header.numrecords:
            return None
        
        try:
            with open(self.filename, 'rb') as infile:
                start_offset = self.header.headerlen + idx * self.header.recordlen
                infile.seek(start_offset, 0)
                sep = infile.read(1)
                if sep == b' ':
                    if self.raw:
                        items = [(field.name, infile.read(field.length)) for field in self.fields]
                    else:
                        if memofile is None:
                            with self._open_memofile() as m:
                                parser = self.parserclass(self, m)
                                items = [(field.name, parser.parse(field, infile.read(field.length))) for field in self.fields]
                        else:
                            parser = self.parserclass(self, memofile)
                            items = [(field.name, parser.parse(field, infile.read(field.length))) for field in self.fields]
                    return self.recfactory(items)
                return None
        except Exception:
            return None

    def find_first_index_by_date(self, target_date: datetime.date) -> int:
        """Finds the index of the first record where CAB_FECHA >= target_date."""
        with self._open_memofile() as memofile:
            low = 0
            high = self.header.numrecords - 1
            ans = self.header.numrecords
            
            while low <= high:
                mid = (low + high) // 2
                rec = self.read_single_record(mid, memofile)
                if rec is None:
                    # Scan outwards to find the nearest non-None record
                    step = 1
                    found = False
                    while True:
                        left_idx = mid - step
                        if left_idx >= low:
                            rec_left = self.read_single_record(left_idx, memofile)
                            if rec_left is not None:
                                mid = left_idx
                                rec = rec_left
                                found = True
                                break
                        right_idx = mid + step
                        if right_idx <= high:
                            rec_right = self.read_single_record(right_idx, memofile)
                            if rec_right is not None:
                                mid = right_idx
                                rec = rec_right
                                found = True
                                break
                        if left_idx < low and right_idx > high:
                            break
                        step += 1
                    if not found:
                        break
                rec_date = parse_dbf_date(rec.get('CAB_FECHA'))
                if rec_date is not None and rec_date >= target_date:
                    ans = mid
                    high = mid - 1
                else:
                    low = mid + 1
            return ans

    def find_first_index_by_id(self, id_field: str, target_id: int) -> int:
        """Finds the index of the first record where id_field >= target_id."""
        with self._open_memofile() as memofile:
            low = 0
            high = self.header.numrecords - 1
            ans = self.header.numrecords
            
            while low <= high:
                mid = (low + high) // 2
                rec = self.read_single_record(mid, memofile)
                if rec is None:
                    # Scan outwards to find the nearest non-None record
                    step = 1
                    found = False
                    while True:
                        left_idx = mid - step
                        if left_idx >= low:
                            rec_left = self.read_single_record(left_idx, memofile)
                            if rec_left is not None:
                                mid = left_idx
                                rec = rec_left
                                found = True
                                break
                        right_idx = mid + step
                        if right_idx <= high:
                            rec_right = self.read_single_record(right_idx, memofile)
                            if rec_right is not None:
                                mid = right_idx
                                rec = rec_right
                                found = True
                                break
                        if left_idx < low and right_idx > high:
                            break
                        step += 1
                    if not found:
                        break
                val = rec.get(id_field)
                if val is not None and val >= target_id:
                    ans = mid
                    high = mid - 1
                else:
                    low = mid + 1
            return ans

    def iter_range(self, start_idx: int, end_idx: Optional[int] = None):
        """Yields records from start_idx up to end_idx using optimized streaming."""
        if end_idx is None:
            end_idx = self.header.numrecords
            
        start_idx = max(0, min(start_idx, self.header.numrecords))
        end_idx = max(0, min(end_idx, self.header.numrecords))
        
        if start_idx >= end_idx:
            return
            
        with open(self.filename, 'rb') as infile, \
             self._open_memofile() as memofile:
            
            start_offset = self.header.headerlen + start_idx * self.header.recordlen
            infile.seek(start_offset, 0)
            
            if not self.raw:
                field_parser = self.parserclass(self, memofile)
                parse = field_parser.parse
                
            skip_record = self._skip_record
            read = infile.read
            
            current_record = start_idx
            while current_record < end_idx:
                sep = read(1)
                if sep == b' ':
                    if self.raw:
                        items = [(field.name, read(field.length)) for field in self.fields]
                    else:
                        items = [(field.name, parse(field, read(field.length))) for field in self.fields]
                    yield self.recfactory(items)
                elif sep in (b'\x1a', b''):
                    break
                else:
                    skip_record(infile)
                current_record += 1

class SupabaseClient:
    """Handles HTTP communication with Supabase PostgREST endpoints."""
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

    def upload_in_batches(self, table: str, data: List[Dict[str, Any]], on_conflict: str, batch_size: int = 500) -> bool:
        """Uploads a list of dictionaries to a Supabase table in batches."""
        if not data:
            logger.info(f"No records to upload to table '{table}'.")
            return True

        endpoint_url = f"{self.url}/rest/v1/{table}?on_conflict={on_conflict}"
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
        
        total = len(data)
        logger.info(f"Uploading {total:,} records to '{table}' (on_conflict={on_conflict})...")
        
        success = True
        for i in range(0, total, batch_size):
            chunk = data[i:i + batch_size]
            req = urllib.request.Request(
                endpoint_url,
                data=json.dumps(chunk).encode('utf-8'),
                headers=headers,
                method="POST"
            )
            try:
                with urllib.request.urlopen(req) as resp:
                    pass
                logger.info(f"  ✓ {min(i + batch_size, total):,} / {total:,} records uploaded to '{table}'")
            except Exception as e:
                logger.error(f"  ✗ Error uploading batch starting at {i}: {e}")
                if hasattr(e, 'read'):
                    try:
                        detail = e.read().decode('utf-8')
                        logger.error(f"    Detail: {detail}")
                    except Exception:
                        pass
                success = False
                time.sleep(1)
        return success

class DBFMetricsExtractor:
    """Extracts daily and hourly sales metrics from DBF files."""
    def __init__(self, dbf_dir: str):
        self.dbf_dir = dbf_dir
        self.cabecera_path = os.path.join(dbf_dir, "cabecera.DBF")
        self.detalle_path = os.path.join(dbf_dir, "detalle.DBF")

    def _get_closed_tickets(self, target_date: datetime.date) -> Dict[int, Dict[str, Any]]:
        """
        Extracts tickets closed on the business date `target_date`.
        Uses binary search to find relevant records instantly.
        """
        if not os.path.exists(self.cabecera_path):
            raise FileNotFoundError(f"Missing DBF file: {self.cabecera_path}")

        cab_table = OptimizedDBF(
            self.cabecera_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )

        logger.info(f"Searching for closed tickets on business date: {target_date}")
        
        # To handle business date shifts (tickets before 2:00 AM count as previous day),
        # we must examine all records with raw CAB_FECHA from target_date to target_date + 1.
        start_idx = cab_table.find_first_index_by_date(target_date)
        start_idx = max(0, start_idx - 100) # Safety buffer
        
        tickets = {}
        processed_count = 0
        
        # Iterate forwards from start_idx
        for record in cab_table.iter_range(start_idx):
            f_fecha = record.get('CAB_FECHA')
            rec_date = parse_dbf_date(f_fecha)
            
            # Stop if we went past target_date + 1
            if rec_date and rec_date > target_date + datetime.timedelta(days=1):
                break
                
            processed_count += 1
            
            # Filter for closed and pending tickets
            cab_estado = record.get('CAB_ESTADO')
            if cab_estado in ('C', 'c', 'N'):
                # Parse hour to compute business date
                hora_raw = record.get('CAB_HORA')
                hora_num = 0
                if isinstance(hora_raw, (datetime.datetime, datetime.time)):
                    hora_num = hora_raw.hour
                elif isinstance(hora_raw, str):
                    parts = hora_raw.strip().split()
                    time_part = parts[-1] if parts else ""
                    if ":" in time_part:
                        try:
                            hora_num = int(time_part.split(":")[0])
                        except ValueError:
                            pass

                # Calculate business date
                if hora_num < 2:
                    business_date = rec_date - datetime.timedelta(days=1) if rec_date else None
                else:
                    business_date = rec_date

                if business_date == target_date:
                    cab_id = record.get('CAB_ID')
                    tipo_cobro = record.get('CAB_COBRO', 'E')
                    
                    if cab_id is not None:
                        tickets[cab_id] = {
                            'tipo_cobro': tipo_cobro,
                            'hora': hora_num,
                            'turno': 'diario'
                        }
                        
        logger.info(f"  Scanned {processed_count:,} records in cabecera.DBF. Found {len(tickets):,} tickets matching business date.")
        return tickets

    def extract_metrics(self, target_date: datetime.date) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Calculates shift and hourly sales summaries for the given date."""
        t0 = time.time()
        
        # 1. Get closed tickets
        tickets = self._get_closed_tickets(target_date)
        if not tickets:
            logger.info("No tickets closed on this date.")
            return [], []

        # 2. Get ticket totals from detail
        if not os.path.exists(self.detalle_path):
            raise FileNotFoundError(f"Missing DBF file: {self.detalle_path}")

        det_table = OptimizedDBF(
            self.detalle_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )

        cab_ids = set(tickets.keys())
        min_cab_id = min(cab_ids)
        max_cab_id = max(cab_ids)

        logger.info(f"Extracting details for ticket IDs from {min_cab_id} to {max_cab_id}...")
        
        # Binary search the detail file to jump straight to the relevant ticket ID
        start_idx = det_table.find_first_index_by_id('DET_ID', min_cab_id)
        start_idx = max(0, start_idx - 100) # Safety buffer
        
        ticket_totals = {}
        processed_count = 0
        
        for record in det_table.iter_range(start_idx):
            det_id = record.get('DET_ID')
            
            # Stop if we went past the max CAB_ID
            if det_id is not None and det_id > max_cab_id:
                break
                
            processed_count += 1
            if det_id in cab_ids:
                importe = record.get('DET_IMPORT', 0.0)
                if isinstance(importe, decimal.Decimal):
                    importe = float(importe)
                ticket_totals[det_id] = ticket_totals.get(det_id, 0.0) + (importe or 0.0)
                
        logger.info(f"  Scanned {processed_count:,} records in detalle.DBF. Summed totals.")

        # 3. Consolidate daily/shift and hourly metrics
        shifts = {}
        hours = {}
        
        for cab_id, meta in tickets.items():
            amount = ticket_totals.get(cab_id, 0.0)
            shift_id = meta['turno']
            
            # Daily/Shift aggregates
            if shift_id not in shifts:
                shifts[shift_id] = {
                    'total_facturado': 0.0,
                    'total_efectivo': 0.0,
                    'total_tarjeta': 0.0,
                    'num_tickets': 0
                }
            shifts[shift_id]['total_facturado'] += amount
            shifts[shift_id]['num_tickets'] += 1
            if meta['tipo_cobro'] == 'E':
                shifts[shift_id]['total_efectivo'] += amount
            else:
                shifts[shift_id]['total_tarjeta'] += amount

            # Hourly aggregates
            h = meta['hora']
            if h not in hours:
                hours[h] = {
                    'total_facturado': 0.0,
                    'num_tickets': 0
                }
            hours[h]['total_facturado'] += amount
            hours[h]['num_tickets'] += 1

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        date_str = target_date.strftime("%Y-%m-%d")

        resumenes_turnos = []
        for s_id, data in shifts.items():
            resumenes_turnos.append({
                'fecha': date_str,
                'turno': s_id,
                'total_facturado': round(data['total_facturado'], 2),
                'num_tickets': data['num_tickets'],
                'total_efectivo': round(data['total_efectivo'], 2),
                'total_tarjeta': round(data['total_tarjeta'], 2),
                'ultima_actualizacion': now_iso
            })

        desglose_horas = []
        for h in sorted(hours.keys()):
            desglose_horas.append({
                'fecha': date_str,
                'hora': h,
                'total_facturado': round(hours[h]['total_facturado'], 2),
                'num_tickets': hours[h]['num_tickets'],
                'ultima_actualizacion': now_iso
            })

        elapsed = time.time() - t0
        logger.info(f"Metrics extraction completed in {elapsed:.3f} seconds.")
        return resumenes_turnos, desglose_horas

class DBFHistoricalExtractor:
    """Extracts the entire historical sales metrics directly from DBF files."""
    def __init__(self, dbf_dir: str):
        self.dbf_dir = dbf_dir
        self.cabecera_path = os.path.join(dbf_dir, "cabecera.DBF")
        self.detalle_path = os.path.join(dbf_dir, "detalle.DBF")

    def extract_all(self, local_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Scans DBF files and generates historical daily/shift and hourly lists."""
        if not os.path.exists(self.cabecera_path):
            raise FileNotFoundError(f"Missing DBF file: {self.cabecera_path}")
        if not os.path.exists(self.detalle_path):
            raise FileNotFoundError(f"Missing DBF file: {self.detalle_path}")

        logger.info(f"Scanning DBF files in '{self.dbf_dir}' for historical extraction...")
        t0 = time.time()

        cab_table = OptimizedDBF(
            self.cabecera_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )

        closed_tickets = {}
        for record in cab_table:
            cab_estado = record.get('CAB_ESTADO')
            if cab_estado in ('C', 'c'):
                cab_id = record.get('CAB_ID')
                if cab_id is not None:
                    rec_date = parse_dbf_date(record.get('CAB_FECHA'))
                    
                    hora_raw = record.get('CAB_HORA')
                    hora_num = 0
                    if isinstance(hora_raw, (datetime.datetime, datetime.time)):
                        hora_num = hora_raw.hour
                    elif isinstance(hora_raw, str):
                        parts = hora_raw.strip().split()
                        time_part = parts[-1] if parts else ""
                        if ":" in time_part:
                            try:
                                hora_num = int(time_part.split(":")[0])
                            except ValueError:
                                pass

                    if hora_num < 2:
                        business_date = rec_date - datetime.timedelta(days=1) if rec_date else None
                    else:
                        business_date = rec_date

                    if business_date:
                        closed_tickets[cab_id] = {
                            'fecha': business_date.strftime("%Y-%m-%d"),
                            'hora': hora_num,
                            'tipo_cobro': record.get('CAB_COBRO', 'E')
                        }

        logger.info(f"  Scanned cabecera.DBF: found {len(closed_tickets):,} closed tickets.")

        det_table = OptimizedDBF(
            self.detalle_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )

        ticket_totals = {}
        processed_count = 0
        for record in det_table:
            processed_count += 1
            if processed_count % 100000 == 0:
                logger.info(f"  Scanned {processed_count:,} records in detalle.DBF...")

            det_id = record.get('DET_ID')
            if det_id in closed_tickets:
                importe = record.get('DET_IMPORT', 0.0)
                if isinstance(importe, decimal.Decimal):
                    importe = float(importe)
                ticket_totals[det_id] = ticket_totals.get(det_id, 0.0) + (importe or 0.0)

        logger.info(f"  Scanned {processed_count:,} records in detalle.DBF. Summed totals.")

        shifts = {}
        hours = {}
        for cab_id, meta in closed_tickets.items():
            amount = ticket_totals.get(cab_id, 0.0)
            fecha = meta['fecha']
            hora = meta['hora']
            tipo_cobro = meta['tipo_cobro']

            s_key = (fecha, 'diario')
            if s_key not in shifts:
                shifts[s_key] = {
                    'total_facturado': 0.0,
                    'total_efectivo': 0.0,
                    'total_tarjeta': 0.0,
                    'num_tickets': 0
                }
            shifts[s_key]['total_facturado'] += amount
            shifts[s_key]['num_tickets'] += 1
            if tipo_cobro == 'E':
                shifts[s_key]['total_efectivo'] += amount
            else:
                shifts[s_key]['total_tarjeta'] += amount

            h_key = (fecha, hora)
            if h_key not in hours:
                hours[h_key] = {
                    'total_facturado': 0.0,
                    'num_tickets': 0
                }
            hours[h_key]['total_facturado'] += amount
            hours[h_key]['num_tickets'] += 1

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        turnos_list = []
        for (fecha, shift_id), data in shifts.items():
            turnos_list.append({
                "local_id": local_id,
                "fecha": fecha,
                "turno": shift_id,
                "total_facturado": round(data['total_facturado'], 2),
                "num_tickets": data['num_tickets'],
                "total_efectivo": round(data['total_efectivo'], 2),
                "total_tarjeta": round(data['total_tarjeta'], 2),
                "ultima_actualizacion": now_iso
            })

        horas_list = []
        for (fecha, hora), data in hours.items():
            horas_list.append({
                "local_id": local_id,
                "fecha": fecha,
                "hora": hora,
                "total_facturado": round(data['total_facturado'], 2),
                "num_tickets": data['num_tickets'],
                "ultima_actualizacion": now_iso
            })

        elapsed = time.time() - t0
        logger.info(f"DBF historical extraction complete: {len(turnos_list):,} daily/shift records, {len(horas_list):,} hourly records. Time: {elapsed:.2f}s")
        return turnos_list, horas_list

class SyncAgent:
    """Coordinates TPV data extraction and upload to Supabase."""
    def __init__(self, local_id: str, supabase_url: Optional[str], supabase_key: Optional[str]):
        self.local_id = local_id
        if supabase_url and supabase_key:
            self.supabase = SupabaseClient(supabase_url, supabase_key)
            logger.info("Supabase Client initialized.")
        else:
            self.supabase = None
            logger.warning("Running in TEST mode (no Supabase credentials provided). Data will not be uploaded.")

    def run_date_sync(self, dbf_dir: str, target_date: Optional[datetime.date] = None) -> bool:
        """Runs a synchronization cycle for a specific business date using DBF files."""
        if target_date is None:
            target_date = datetime.date.today()
            
        try:
            extractor = DBFMetricsExtractor(dbf_dir)
            turnos, horas = extractor.extract_metrics(target_date)
            
            # Print report to console
            for t in turnos:
                logger.info(f"Turno '{t['turno']}' [{self.local_id}]: Total: {t['total_facturado']}€ | Tickets: {t['num_tickets']} | Efectivo: {t['total_efectivo']}€ | Tarjeta: {t['total_tarjeta']}€")
            
            if self.supabase:
                # Add local_id to the payloads
                turnos_payload = [{**t, "local_id": self.local_id} for t in turnos]
                horas_payload = [{**h, "local_id": self.local_id} for h in horas]
                
                # Upload
                t_success = self.supabase.upload_in_batches("ventas_resumen_diario", turnos_payload, "local_id,fecha,turno", batch_size=200)
                h_success = self.supabase.upload_in_batches("ventas_por_hora", horas_payload, "local_id,fecha,hora", batch_size=500)
                
                return t_success and h_success
            return True
        except Exception as e:
            logger.exception(f"Error during date sync execution: {e}")
            return False

    def run_historical_upload(self, dbf_dir: str) -> bool:
        """Extracts the entire history from DBF files and uploads it in batches."""
        if not self.supabase:
            logger.error("Cannot perform historical upload without Supabase credentials!")
            return False
            
        try:
            extractor = DBFHistoricalExtractor(dbf_dir)
            turnos, horas = extractor.extract_all(self.local_id)
            
            t_success = self.supabase.upload_in_batches("ventas_resumen_diario", turnos, "local_id,fecha,turno", batch_size=200)
            h_success = self.supabase.upload_in_batches("ventas_por_hora", horas, "local_id,fecha,hora", batch_size=500)
            
            if t_success and h_success:
                logger.info("HISTORICAL UPLOAD AND SYNC COMPLETED SUCCESSFULLY!")
                return True
            else:
                logger.warning("Historical upload completed with some errors.")
                return False
        except Exception as e:
            logger.exception(f"Error during historical upload: {e}")
            return False

def main():
    # Load .env configuration
    load_env()

    parser = argparse.ArgumentParser(description="Agente de sincronización local TPV -> Supabase")
    
    # Mode selection
    parser.add_argument("--mode", choices=["sync", "upload-all"], default="sync",
                        help="Modo de ejecución: 'sync' para sincronizar fecha específica/hoy desde DBF; 'upload-all' para subir histórico completo desde DBF")
    
    # DBF Sincronización Options
    parser.add_argument("--dbf-dir", default="../datos", help="Directorio con cabecera.DBF y detalle.DBF")
    parser.add_argument("--local-id", default="local_1", help="ID único del local")
    parser.add_argument("--date", default=None, help="Fecha específica a sincronizar (YYYY-MM-DD), por defecto es hoy")
    parser.add_argument("--interval", type=int, default=600, help="Intervalo de ejecución continua en segundos (0 = ejecutar una sola vez)")
    
    # SQLite Upload Options (Deprecated/kept for compatibility)
    parser.add_argument("--db-path", default="base_datos.db", help="Ruta al archivo SQLite de base de datos (obsoleto)")
    
    # Supabase Configuration (falls back to env variables loaded from .env)
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="URL de Supabase")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_KEY"), help="API/Service Key de Supabase")

    args = parser.parse_args()

    # Log variables availability (do not print key for security)
    if args.supabase_url and args.supabase_key:
        logger.info(f"Supabase configured: URL={args.supabase_url}")
    else:
        logger.warning("Supabase credentials not configured. Running in dry-run mode.")

    # Initialize agent
    agent = SyncAgent(
        local_id=args.local_id,
        supabase_url=args.supabase_url,
        supabase_key=args.supabase_key
    )

    # Process based on mode
    if args.mode == "upload-all":
        agent.run_historical_upload(args.dbf_dir)
    else:
        # Modo 'sync'
        target_date = None
        if args.date:
            try:
                target_date = datetime.datetime.strptime(args.date, "%Y-%m-%d").date()
            except ValueError:
                logger.error("Formato de fecha inválido. Utilice AAAA-MM-DD.")
                sys.exit(1)

        if args.interval > 0:
            logger.info(f"Iniciando servicio de sincronización para '{args.local_id}' cada {args.interval} segundos.")
            while True:
                try:
                    # If date was not specified, target_date remains None, so it dynamically calculates today's date in each cycle.
                    agent.run_date_sync(args.dbf_dir, target_date)
                except Exception as e:
                    logger.exception(f"Error en bucle de sincronización: {e}")
                time.sleep(args.interval)
        else:
            agent.run_date_sync(args.dbf_dir, target_date)

if __name__ == '__main__':
    main()