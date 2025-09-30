-- Crear tablas para el sistema de horarios y citas

-- Tabla para configuraciones de horarios de tutores
CREATE TABLE IF NOT EXISTS configuracion_horarios_tutor (
    id SERIAL PRIMARY KEY,
    tutor_email VARCHAR(255) NOT NULL,
    nombre_configuracion VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    duracion_cita INTEGER DEFAULT 30,
    dias_semana JSONB NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para horarios específicos de tutores
CREATE TABLE IF NOT EXISTS horarios_tutor (
    id SERIAL PRIMARY KEY,
    tutor_email VARCHAR(255) NOT NULL,
    dia VARCHAR(20) NOT NULL, -- lunes, martes, etc.
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para citas del calendario
CREATE TABLE IF NOT EXISTS cites_calendari (
    id VARCHAR(255) PRIMARY KEY,
    alumne_id VARCHAR(255),
    tutor_email VARCHAR(255) NOT NULL,
    any_curs VARCHAR(20) NOT NULL,
    data_cita TIMESTAMP NOT NULL,
    durada_minuts INTEGER DEFAULT 30,
    nom_familia VARCHAR(255) NOT NULL,
    email_familia VARCHAR(255) NOT NULL,
    telefon_familia VARCHAR(50),
    notes TEXT,
    estat VARCHAR(50) DEFAULT 'pendent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para eventos del calendario (integración con Google Calendar)
CREATE TABLE IF NOT EXISTS eventos_calendario (
    id SERIAL PRIMARY KEY,
    tutor_email VARCHAR(255) NOT NULL,
    cita_id VARCHAR(255),
    google_event_id VARCHAR(255),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    estado VARCHAR(50) DEFAULT 'reservado',
    datos_familia JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para borradores de entrevistas
CREATE TABLE IF NOT EXISTS borradores_entrevista (
    id SERIAL PRIMARY KEY,
    cita_id VARCHAR(255) NOT NULL,
    alumne_id VARCHAR(255) NOT NULL,
    tutor_email VARCHAR(255) NOT NULL,
    fecha_entrevista TIMESTAMP NOT NULL,
    observaciones TEXT,
    puntos_tratados TEXT,
    acuerdos TEXT,
    seguimiento TEXT,
    estado VARCHAR(50) DEFAULT 'borrador', -- borrador, completada, archivada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_configuracion_horarios_tutor_email ON configuracion_horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_email ON horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_tutor ON cites_calendari(tutor_email);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_fecha ON cites_calendari(data_cita);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_tutor ON eventos_calendario(tutor_email);
CREATE INDEX IF NOT EXISTS idx_borradores_entrevista_cita ON borradores_entrevista(cita_id);

-- Comentarios para documentación
COMMENT ON TABLE configuracion_horarios_tutor IS 'Configuraciones de horarios disponibles para tutores';
COMMENT ON TABLE horarios_tutor IS 'Horarios específicos de cada tutor por día de la semana';
COMMENT ON TABLE cites_calendari IS 'Citas programadas en el calendario';
COMMENT ON TABLE eventos_calendario IS 'Eventos sincronizados con Google Calendar';
COMMENT ON TABLE borradores_entrevista IS 'Borradores de entrevistas para completar después de la cita';
