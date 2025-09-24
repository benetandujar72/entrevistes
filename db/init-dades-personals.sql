-- Script de inicialización para datos personales
-- Este script se ejecuta automáticamente cuando se levanta la base de datos

-- Actualizar tabla pf con nuevos campos
ALTER TABLE pf ADD COLUMN IF NOT EXISTS municipi_naixement TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS nacionalitat TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS adreca TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS municipi_residencia TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS codi_postal TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS doc_identitat TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS tis TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS ralc TEXT;
ALTER TABLE pf ADD COLUMN IF NOT EXISTS link_fotografia TEXT;

-- Actualizar tabla alumnes con email
ALTER TABLE alumnes ADD COLUMN IF NOT EXISTS email TEXT;

-- Crear tabla cites_calendari
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

-- Crear índices para cites_calendari
CREATE INDEX IF NOT EXISTS idx_cites_calendari_alumne ON cites_calendari(alumne_id);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_tutor ON cites_calendari(tutor_email);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_data ON cites_calendari(data_cita);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_estat ON cites_calendari(estat);

-- Crear tabla solicituts_canvi_dades
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

-- Crear índices para solicituts_canvi_dades
CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_alumne ON solicituts_canvi_dades(alumne_id);
CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_tutor ON solicituts_canvi_dades(tutor_solicitant);
CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_estat ON solicituts_canvi_dades(estat);

-- Insertar datos de ejemplo para testing
INSERT INTO cursos(any_curs) VALUES ('2025-2026') ON CONFLICT DO NOTHING;

-- Crear algunos grupos de ejemplo
INSERT INTO grups(grup_id, any_curs, curs, nom) VALUES 
('1A_2025-2026', '2025-2026', '1r', '1A'),
('1B_2025-2026', '2025-2026', '1r', '1B'),
('2A_2025-2026', '2025-2026', '2n', '2A'),
('2B_2025-2026', '2025-2026', '2n', '2B'),
('3A_2025-2026', '2025-2026', '3r', '3A'),
('3B_2025-2026', '2025-2026', '3r', '3B'),
('4A_2025-2026', '2025-2026', '4t', '4A'),
('4B_2025-2026', '2025-2026', '4t', '4B'),
('4C_2025-2026', '2025-2026', '4t', '4C')
ON CONFLICT DO NOTHING;

-- Crear tabla de horarios de tutores (actualizada)
CREATE TABLE IF NOT EXISTS horarios_tutor (
    id SERIAL PRIMARY KEY,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    dia_semana TEXT NOT NULL CHECK (dia_semana IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    duracion_cita INTEGER DEFAULT 30, -- Duración en minutos (15, 30, 60)
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para configuraciones de horarios por tutor
CREATE TABLE IF NOT EXISTS configuracion_horarios_tutor (
    id SERIAL PRIMARY KEY,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    nombre_configuracion TEXT NOT NULL, -- Nombre descriptivo de la configuración
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    duracion_cita INTEGER DEFAULT 30, -- Duración por defecto en minutos
    dias_semana JSONB NOT NULL, -- Array de días configurados con horarios
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para eventos de Google Calendar generados
CREATE TABLE IF NOT EXISTS eventos_calendario (
    id SERIAL PRIMARY KEY,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    alumne_id TEXT REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    google_event_id TEXT UNIQUE, -- ID del evento en Google Calendar
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'confirmado', 'cancelado')),
    datos_familia JSONB, -- Información de la familia si está reservado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para horarios_tutor
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_email ON horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_fechas ON horarios_tutor(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_dia ON horarios_tutor(dia_semana);

-- Crear índices para configuracion_horarios_tutor
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_email ON configuracion_horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_fechas ON configuracion_horarios_tutor(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_activo ON configuracion_horarios_tutor(activo);

-- Crear índices para eventos_calendario
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_tutor ON eventos_calendario(tutor_email);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_alumne ON eventos_calendario(alumne_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_fechas ON eventos_calendario(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_estado ON eventos_calendario(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_google_id ON eventos_calendario(google_event_id);
