-- Script para verificar y crear tablas necesarias para configuración de horarios

-- Verificar si la tabla configuracion_horarios_tutor existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_horarios_tutor') THEN
        -- Crear tabla configuracion_horarios_tutor
        CREATE TABLE configuracion_horarios_tutor (
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
        CREATE INDEX idx_config_horarios_tutor_email ON configuracion_horarios_tutor(tutor_email);
        CREATE INDEX idx_config_horarios_tutor_fechas ON configuracion_horarios_tutor(fecha_inicio, fecha_fin);
        CREATE INDEX idx_config_horarios_tutor_activo ON configuracion_horarios_tutor(activo);
        
        RAISE NOTICE 'Tabla configuracion_horarios_tutor creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla configuracion_horarios_tutor ya existe';
    END IF;
END $$;

-- Verificar si la tabla eventos_calendario existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eventos_calendario') THEN
        -- Crear tabla eventos_calendario
        CREATE TABLE eventos_calendario (
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
        
        -- Crear índices
        CREATE INDEX idx_eventos_calendario_tutor ON eventos_calendario(tutor_email);
        CREATE INDEX idx_eventos_calendario_alumne ON eventos_calendario(alumne_id);
        CREATE INDEX idx_eventos_calendario_fecha ON eventos_calendario(fecha_inicio);
        CREATE INDEX idx_eventos_calendario_estado ON eventos_calendario(estado);
        
        RAISE NOTICE 'Tabla eventos_calendario creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla eventos_calendario ya existe';
    END IF;
END $$;

-- Mostrar todas las tablas relacionadas con horarios
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name LIKE '%horario%' OR table_name LIKE '%configuracion%' OR table_name LIKE '%evento%'
ORDER BY table_name;
