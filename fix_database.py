#!/usr/bin/env python3
import psycopg2
import os

def fix_database():
    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(
            host="localhost",
            port="5433",
            database="entrevistes",
            user="postgres",
            password="postgres"
        )
        cur = conn.cursor()
        
        print("Conectado a la base de datos")
        
        # Actualizar tabla pf con nuevos campos
        print("Actualizando tabla pf...")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS municipi_naixement TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS nacionalitat TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS adreca TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS municipi_residencia TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS codi_postal TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS doc_identitat TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS tis TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS ralc TEXT;")
        cur.execute("ALTER TABLE pf ADD COLUMN IF NOT EXISTS link_fotografia TEXT;")
        
        # Actualizar tabla alumnes con email
        print("Actualizando tabla alumnes...")
        cur.execute("ALTER TABLE alumnes ADD COLUMN IF NOT EXISTS email TEXT;")
        
        # Crear tabla cites_calendari
        print("Creando tabla cites_calendari...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cites_calendari (
                id TEXT PRIMARY KEY,
                alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
                tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
                any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
                data_cita TIMESTAMP WITH TIME ZONE NOT NULL,
                durada_minuts INTEGER DEFAULT 30,
                nom_familia TEXT NOT NULL,
                email_familia TEXT NOT NULL,
                telefon_familia TEXT NOT NULL,
                estat TEXT NOT NULL CHECK (estat IN ('pendent','confirmada','realitzada','cancelada')) DEFAULT 'pendent',
                notes TEXT,
                google_event_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Crear índices para cites_calendari
        print("Creando índices para cites_calendari...")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cites_calendari_alumne ON cites_calendari(alumne_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cites_calendari_tutor ON cites_calendari(tutor_email);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cites_calendari_data ON cites_calendari(data_cita);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cites_calendari_estat ON cites_calendari(estat);")
        
        # Crear tabla solicituts_canvi_dades
        print("Creando tabla solicituts_canvi_dades...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS solicituts_canvi_dades (
                id TEXT PRIMARY KEY,
                alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
                tutor_solicitant TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
                camp_modificar TEXT NOT NULL,
                valor_actual TEXT,
                valor_nou TEXT,
                justificacio TEXT NOT NULL,
                estat TEXT NOT NULL CHECK (estat IN ('pendent','aprovada','rebutjada')) DEFAULT 'pendent',
                admin_responsable TEXT REFERENCES usuaris(email),
                data_resolucio TIMESTAMP WITH TIME ZONE,
                notes_admin TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Crear índices para solicituts_canvi_dades
        print("Creando índices para solicituts_canvi_dades...")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_alumne ON solicituts_canvi_dades(alumne_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_tutor ON solicituts_canvi_dades(tutor_solicitant);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_estat ON solicituts_canvi_dades(estat);")
        
        # Confirmar cambios
        conn.commit()
        print("✅ Base de datos actualizada correctamente")
        
        # Verificar tablas
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cur.fetchall()
        print("Tablas en la base de datos:")
        for table in tables:
            print(f"  - {table[0]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_database()
