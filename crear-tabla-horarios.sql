-- Crear tabla configuracion_horarios_tutor si no existe
CREATE TABLE IF NOT EXISTS configuracion_horarios_tutor (
    id SERIAL PRIMARY KEY,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    nombre_configuracion TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    duracion_cita INTEGER DEFAULT 30,
    dias_semana JSONB NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_email ON configuracion_horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_fechas ON configuracion_horarios_tutor(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_activo ON configuracion_horarios_tutor(activo);

-- Crear tabla eventos_calendario si no existe
CREATE TABLE IF NOT EXISTS eventos_calendario (
    id SERIAL PRIMARY KEY,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    alumne_id TEXT REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    google_event_id TEXT UNIQUE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'reservado', 'confirmado', 'cancelado')),
    datos_familia JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para eventos_calendario
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_tutor ON eventos_calendario(tutor_email);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_alumne ON eventos_calendario(alumne_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_fecha ON eventos_calendario(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_estado ON eventos_calendario(estado);

-- Verificar que las tablas se crearon correctamente
SELECT 'configuracion_horarios_tutor' as tabla, COUNT(*) as registros FROM configuracion_horarios_tutor
UNION ALL
SELECT 'eventos_calendario' as tabla, COUNT(*) as registros FROM eventos_calendario;
