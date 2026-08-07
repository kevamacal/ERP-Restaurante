import os
import sys
import json
import time
import urllib.request
import urllib.parse
from typing import Dict, List, Any
from dbfread import DBF, FieldParser

class CustomFieldParser(FieldParser):
    def parse(self, field, data):
        try:
            return super().parse(field, data)
        except Exception:
            return None

class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }

    def upload_in_batches(self, table: str, data: List[Dict[str, Any]], on_conflict: str, batch_size: int = 200) -> bool:
        if not data:
            print(f"No records to upload to table '{table}'.")
            return True

        endpoint_url = f"{self.url}/rest/v1/{table}?on_conflict={on_conflict}"
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
        
        total = len(data)
        print(f"Uploading {total:,} records to '{table}' (on_conflict={on_conflict})...")
        
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
                print(f"  ✓ {min(i + batch_size, total):,} / {total:,} records uploaded to '{table}'")
            except Exception as e:
                print(f"  ✗ Error uploading batch starting at {i}: {e}")
                if hasattr(e, 'read'):
                    try:
                        detail = e.read().decode('utf-8')
                        print(f"    Detail: {detail}")
                    except Exception:
                        pass
                success = False
                time.sleep(1)
        return success

# Categories ID to Name mapping
CATEGORIES_MAP = {
    '3': 'Ensaladas',
    '5': 'Tapas y Raciones',
    '4': 'Chacinas e Ibéricos',
    'b': 'Guisos y Especialidades',
    'c': 'Carnes a la Plancha/Parrilla',
    'g': 'Parrilladas y Carnes',
    'd': 'Pescados Fritos',
    'e': 'Pescados a la Plancha',
    'f': 'Revueltos y Tortillas',
    'a': 'Montaditos y Bocadillos',
    '0': 'Bebidas y Cervezas',
    '2': 'Vinos Tintos',
    '1': 'Vinos Blancos y Finos',
    'k': 'Cafetería e Infusiones',
    'l': 'Postres Caseros',
    'n': 'Copas y Licores',
    'o': 'Chupitos',
    'h': 'Snacks y Suplementos',
    'm': 'Helados',
    'p': 'Cócteles',
    'u': 'Media Raciones / Desayunos'
}

def load_env(env_path: str = ".env") -> None:
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip()
            print("Loaded configuration from .env file.")
        except Exception as e:
            print(f"Could not read .env file: {e}")

def main():
    load_env()
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env or as environment variables.")
        sys.exit(1)
        
    dbf_path = "archivos/articulos.DBF"
    if not os.path.exists(dbf_path):
        print(f"ERROR: DBF file not found at '{dbf_path}'")
        sys.exit(1)
        
    print(f"Reading DBF file: {dbf_path}...")
    try:
        table = DBF(
            dbf_path,
            load=False,
            encoding='cp1252',
            ignore_missing_memofile=True,
            char_decode_errors='replace',
            parserclass=CustomFieldParser
        )
        
        products = []
        for r in table:
            # Parse record fields
            codigo = r.get('ART_CODIGO', '').strip()
            nombre = r.get('ART_DESCRI', '').strip()
            
            # Skip if code or name is empty
            if not codigo or not nombre:
                continue
                
            group_id = r.get('ART_GRUPO', '').strip()
            categoria = CATEGORIES_MAP.get(group_id, 'Otros')
            
            # Extract price (defaulting to Tariff 1)
            precio_raw = r.get('ART_TVENT1', 0.0)
            try:
                precio = float(precio_raw)
            except Exception:
                precio = 0.0
                
            activo = not r.get('ART_BAJA', False)
            
            # Memo text fields
            caracteristicas = r.get('ART_LARGA', '')
            if caracteristicas is None:
                caracteristicas = ''
            else:
                caracteristicas = str(caracteristicas).strip()
                
            imagen_url = r.get('ART_IMAGEN', '')
            if imagen_url is None:
                imagen_url = ''
            else:
                imagen_url = str(imagen_url).strip()
                
            products.append({
                "codigo": codigo,
                "nombre": nombre,
                "categoria": categoria,
                "precio": round(precio, 2),
                "activo": activo,
                "caracteristicas": caracteristicas if caracteristicas else None,
                "imagen_url": imagen_url if imagen_url else None
            })
            
        print(f"Parsed {len(products):,} products successfully.")
        
        client = SupabaseClient(supabase_url, supabase_key)
        success = client.upload_in_batches("productos", products, "codigo", batch_size=200)
        
        if success:
            print("✓ Products synchronized to Supabase successfully!")
        else:
            print("✗ Some batches failed to upload.")
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: An exception occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
