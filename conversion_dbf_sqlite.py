import os
import glob
import sqlite3
import time
import argparse
import datetime
import decimal
from dbfread import DBF, FieldParser

class CustomFieldParser(FieldParser):
    def parse(self, field, data):
        try:
            return super().parse(field, data)
        except Exception:
            return None

def dbf_type_to_sqlite(field):
    """
    Map DBF field types to SQLite column types.
    N: Numeric (INTEGER if decimal_count == 0 else REAL)
    F: Float
    I: Integer
    O: Double
    B: Double/Binary
    L: Logical (Boolean)
    D: Date
    C/M: Character/Memo
    """
    ftype = field.type
    dec = getattr(field, 'decimal_count', 0)
    
    if ftype == 'N':
        return 'INTEGER' if dec == 0 else 'REAL'
    elif ftype in ('F', 'O', 'B'):
        return 'REAL'
    elif ftype == 'I':
        return 'INTEGER'
    elif ftype == 'L':
        return 'INTEGER'  # 1 for True, 0 for False, NULL for None
    elif ftype == 'D':
        return 'TEXT'
    else:
        return 'TEXT'

def convert_single_dbf(dbf_path, conn, table_name=None, encoding='cp1252', batch_size=10000):
    if not table_name:
        table_name = os.path.splitext(os.path.basename(dbf_path))[0].lower()
        
    print(f"\n==========================================")
    print(f"Procesando archivo: {os.path.basename(dbf_path)}")
    print(f"Tabla destino: {table_name}")
    start_time = time.time()
    
    try:
        table = DBF(
            dbf_path,
            load=False,
            encoding=encoding,
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )
    except Exception as e:
        print(f"Error al abrir {dbf_path}: {e}")
        return False
        
    field_names = [f.name for f in table.fields]
    total_records = len(table)
    print(f"Campos ({len(field_names)}): {', '.join(field_names)}")
    print(f"Total de registros: {total_records:,}")
    
    cursor = conn.cursor()
    cursor.execute("PRAGMA synchronous = OFF;")
    cursor.execute("PRAGMA journal_mode = MEMORY;")
    
    columns_def = []
    for f in table.fields:
        sql_type = dbf_type_to_sqlite(f)
        columns_def.append(f'"{f.name}" {sql_type}')
        
    create_table_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(columns_def)});'
    
    cursor.execute(f'DROP TABLE IF EXISTS "{table_name}";')
    cursor.execute(create_table_sql)
    conn.commit()
    
    placeholders = ", ".join(["?"] * len(field_names))
    insert_sql = f'INSERT INTO "{table_name}" ({", ".join([f'"{name}"' for name in field_names])}) VALUES ({placeholders});'
    
    batch = []
    processed = 0
    
    conn.execute("BEGIN TRANSACTION;")
    for record in table:
        row = []
        for name in field_names:
            val = record[name]
            if val is None:
                row.append(None)
            elif isinstance(val, bool):
                row.append(1 if val else 0)
            elif isinstance(val, (datetime.date, datetime.datetime)):
                row.append(val.isoformat())
            elif isinstance(val, decimal.Decimal):
                row.append(float(val))
            elif isinstance(val, (bytes, bytearray)):
                row.append(val.decode(encoding, errors='replace'))
            else:
                row.append(val)
        batch.append(row)
        processed += 1
        
        if len(batch) >= batch_size:
            cursor.executemany(insert_sql, batch)
            batch = []
            if total_records > 0:
                print(f"  Progreso: {processed:,} / {total_records:,} registros ({(processed/total_records)*100:.1f}%)")
            
    if batch:
        cursor.executemany(insert_sql, batch)
        
    conn.commit()
    
    if 'ID' in field_names:
        cursor.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table_name}_id" ON "{table_name}" ("ID");')
        conn.commit()

    elapsed = time.time() - start_time
    print(f"--> Completado en {elapsed:.2f} segundos ({processed:,} registros).")
    return True

def convert_all_in_folder(folder_path, sqlite_path, encoding='cp1252', batch_size=10000):
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"La carpeta especificada no existe: {folder_path}")
        
    dbf_files = sorted(glob.glob(os.path.join(folder_path, "**", "*.[dD][bB][fF]"), recursive=True))
    if not dbf_files:
        print(f"No se encontraron archivos .DBF en: {folder_path}")
        return
        
    print(f"Se encontraron {len(dbf_files)} archivos DBF en '{folder_path}' para convertir.")
    print(f"Base de datos SQLite destino: {os.path.abspath(sqlite_path)}")
    
    conn = sqlite3.connect(sqlite_path)
    total_start = time.time()
    
    successful = 0
    for dbf_file in dbf_files:
        if convert_single_dbf(dbf_file, conn, encoding=encoding, batch_size=batch_size):
            successful += 1
            
    conn.close()
    total_elapsed = time.time() - total_start
    print(f"\n==========================================")
    print(f"¡CONVERSIÓN FINALIZADA EN {total_elapsed:.2f} SEGUNDOS!")
    print(f"Se convirtieron {successful} de {len(dbf_files)} tablas correctamente.")
    print(f"Base de datos guardada en: {os.path.abspath(sqlite_path)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Convertidor masivo de archivos DBF a tablas SQLite.")
    parser.add_argument("--folder", default="archivos", help="Carpeta que contiene los archivos DBF (por defecto: archivos)")
    parser.add_argument("--sqlite", default="base_datos.db", help="Ruta al archivo SQLite de salida (por defecto: base_datos.db)")
    parser.add_argument("--encoding", default="cp1252", help="Codificación de texto de los DBF (por defecto: cp1252)")
    
    args = parser.parse_args()
    
    target_folder = args.folder
    if not os.path.exists(target_folder):
        target_folder = "."
        
    convert_all_in_folder(target_folder, args.sqlite, encoding=args.encoding)
