-- Esquema canónico (agnóstico a motor, compatible con PostgreSQL)
-- Identificadores: usamos ULID/UUID como TEXT para portabilidad entre sistemas.

-- ========= Dominios y tipos ========
-- Estados del alumno por curso
CREATE TABLE IF NOT EXISTS estados_alumno (
    estado TEXT PRIMARY KEY CHECK (estado IN ('alta','baixa','migrat'))
);

INSERT INTO estados_alumno(estado) VALUES ('alta') ON CONFLICT DO NOTHING;
INSERT INTO estados_alumno(estado) VALUES ('baixa') ON CONFLICT DO NOTHING;
INSERT INTO estados_alumno(estado) VALUES ('migrat') ON CONFLICT DO NOTHING;

-- ========= Configuración global ========
CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper: set anyActual = "2025-2026"
-- INSERT INTO config(clave, valor) VALUES ('anyActual', '"2025-2026"') ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor, updated_at=NOW();

-- ========= Cursos y Grupos ========
CREATE TABLE IF NOT EXISTS cursos (
    any_curs TEXT PRIMARY KEY, -- p.ej. "2025-2026"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grups (
    grup_id TEXT PRIMARY KEY, -- p.ej. "1A_2025-2026" o un ULID
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    curs TEXT NOT NULL,  -- "1r","2n","3r","4t"
    nom TEXT NOT NULL,   -- "1A","1B"...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grups_any_curs ON grups(any_curs);

-- ========= Dades personals/familiars (PF) ========
CREATE TABLE IF NOT EXISTS pf (
    personal_id TEXT PRIMARY KEY,
    sexe TEXT CHECK (sexe IN ('H','D','X') OR sexe IS NULL), -- H=Home, D=Dona, X=Altres
    data_naixement DATE,
    municipi_naixement TEXT,
    nacionalitat TEXT,
    adreca TEXT,
    municipi_residencia TEXT,
    codi_postal TEXT,
    doc_identitat TEXT, -- DNI/NIE
    tis TEXT, -- TIS
    ralc TEXT, -- RALC
    link_fotografia TEXT,
    tutor1_nom TEXT,
    tutor1_tel TEXT,
    tutor1_email TEXT,
    tutor2_nom TEXT,
    tutor2_tel TEXT,
    tutor2_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========= Citas de calendario ========
CREATE TABLE IF NOT EXISTS cites_calendari (
    id TEXT PRIMARY KEY, -- ULID/UUID
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    data_cita TIMESTAMP WITH TIME ZONE NOT NULL,
    durada_minuts INTEGER DEFAULT 30,
    nom_familia TEXT NOT NULL, -- Nombre de la persona que hace la reserva
    email_familia TEXT NOT NULL, -- Email de quien hace la reserva
    telefon_familia TEXT NOT NULL, -- Teléfono de quien hace la reserva
    estat TEXT NOT NULL CHECK (estat IN ('pendent','confirmada','realitzada','cancelada')) DEFAULT 'pendent',
    notes TEXT,
    google_event_id TEXT, -- ID del evento en Google Calendar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cites_calendari_alumne ON cites_calendari(alumne_id);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_tutor ON cites_calendari(tutor_email);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_data ON cites_calendari(data_cita);
CREATE INDEX IF NOT EXISTS idx_cites_calendari_estat ON cites_calendari(estat);

-- ========= Solicitudes de cambio de datos ========
CREATE TABLE IF NOT EXISTS solicituts_canvi_dades (
    id TEXT PRIMARY KEY, -- ULID/UUID
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    tutor_solicitant TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    camp_modificar TEXT NOT NULL, -- 'email', 'telefon', 'adreca', etc.
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

-- Tabla para horarios de tutores
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

-- Tabla para configuraciones de horarios por tutor
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

-- Tabla para eventos de Google Calendar generados
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

CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_alumne ON solicituts_canvi_dades(alumne_id);
CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_tutor ON solicituts_canvi_dades(tutor_solicitant);
CREATE INDEX IF NOT EXISTS idx_solicituts_canvi_estat ON solicituts_canvi_dades(estat);

-- Índices para horarios_tutor
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_email ON horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_fechas ON horarios_tutor(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_horarios_tutor_dia ON horarios_tutor(dia_semana);

-- Índices para configuracion_horarios_tutor
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_email ON configuracion_horarios_tutor(tutor_email);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_fechas ON configuracion_horarios_tutor(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_config_horarios_tutor_activo ON configuracion_horarios_tutor(activo);

-- Índices para eventos_calendario
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_tutor ON eventos_calendario(tutor_email);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_alumne ON eventos_calendario(alumne_id);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_fechas ON eventos_calendario(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_estado ON eventos_calendario(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_google_id ON eventos_calendario(google_event_id);

-- ========= Alumnes (identidad estable) ========
CREATE TABLE IF NOT EXISTS alumnes (
    alumne_id TEXT PRIMARY KEY, -- ULID/UUID estable en todos los cursos
    nom TEXT NOT NULL,
    email TEXT, -- Email del alumno
    personal_id TEXT REFERENCES pf(personal_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumnes_personal ON alumnes(personal_id);

-- ========= Pertenencia anual a curso/grupo ========
CREATE TABLE IF NOT EXISTS alumnes_curs (
    id TEXT PRIMARY KEY, -- ULID/UUID
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    grup_id TEXT REFERENCES grups(grup_id) ON DELETE SET NULL,
    estat TEXT NOT NULL REFERENCES estados_alumno(estado),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(alumne_id, any_curs)
);

CREATE INDEX IF NOT EXISTS idx_alumnes_curs_alumne ON alumnes_curs(alumne_id);
CREATE INDEX IF NOT EXISTS idx_alumnes_curs_any ON alumnes_curs(any_curs);
CREATE INDEX IF NOT EXISTS idx_alumnes_curs_grup ON alumnes_curs(grup_id);
CREATE INDEX IF NOT EXISTS idx_alumnes_curs_estat ON alumnes_curs(estat);

-- ========= Entrevistes ========
CREATE TABLE IF NOT EXISTS entrevistes (
    id TEXT PRIMARY KEY, -- ULID/UUID
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    data DATE NOT NULL,
    acords TEXT,
    usuari_creador_id TEXT NOT NULL, -- email
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrevistes_alumne ON entrevistes(alumne_id);
CREATE INDEX IF NOT EXISTS idx_entrevistes_any ON entrevistes(any_curs);
CREATE INDEX IF NOT EXISTS idx_entrevistes_data ON entrevistes(data);

-- ========= Usuaris y asignaciones de grupo ========
CREATE TABLE IF NOT EXISTS usuaris (
    email TEXT PRIMARY KEY,
    rol TEXT NOT NULL CHECK (rol IN ('docent','admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restricción opcional de dominio (puede moverse a capa de aplicación)
-- ALTER TABLE usuaris ADD CONSTRAINT chk_email_domain CHECK (email LIKE '%@insbitacola.cat');

CREATE TABLE IF NOT EXISTS assignacions_docent_grup (
    email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    grup_id TEXT NOT NULL REFERENCES grups(grup_id) ON DELETE CASCADE,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    PRIMARY KEY(email, grup_id, any_curs)
);

-- ========= Tutorías personales por alumno (por curso) ========
CREATE TABLE IF NOT EXISTS tutories_alumne (
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    tutor_email TEXT NOT NULL REFERENCES usuaris(email) ON DELETE CASCADE,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    PRIMARY KEY(alumne_id, any_curs)
);
CREATE INDEX IF NOT EXISTS idx_tutories_tutor ON tutories_alumne(tutor_email, any_curs);

-- ========= Auditoria ========
CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    entitat TEXT NOT NULL,           -- 'alumne','entrevista','pf','grup','config', etc.
    entitat_id TEXT,
    accio TEXT NOT NULL,             -- 'create','update','delete','import','migrate'
    usuari TEXT,                     -- email
    detalls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========= Vistas de conveniencia ========
-- Vista alumnos del curso actual (requiere config.anyActual)
-- Nota: evaluar materializar en capa de aplicación para mayor portabilidad.

-- ========= Consolidación de Pestañas ========
-- Tabla para mapear cursos y pestañas de Google Sheets
CREATE TABLE IF NOT EXISTS curso_pestanas (
    id TEXT PRIMARY KEY, -- ULID/UUID
    curso_nombre TEXT NOT NULL, -- '1r ESO', '2n ESO', '3r ESO', '4t ESO'
    pestana_nombre TEXT NOT NULL, -- Nombre de la pestaña en el spreadsheet
    spreadsheet_id TEXT NOT NULL, -- ID del Google Spreadsheet
    orden INTEGER DEFAULT 0, -- Orden de procesamiento
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(curso_nombre, pestana_nombre, spreadsheet_id)
);

CREATE INDEX IF NOT EXISTS idx_curso_pestanas_curso ON curso_pestanas(curso_nombre);
CREATE INDEX IF NOT EXISTS idx_curso_pestanas_spreadsheet ON curso_pestanas(spreadsheet_id);

-- Tabla para consolidación de entrevistas por pestañas
CREATE TABLE IF NOT EXISTS entrevistes_consolidadas (
    id TEXT PRIMARY KEY, -- ULID/UUID
    alumne_id TEXT NOT NULL REFERENCES alumnes(alumne_id) ON DELETE CASCADE,
    curso_origen TEXT NOT NULL, -- '1r ESO', '2n ESO', etc.
    pestana_origen TEXT NOT NULL, -- Nombre de la pestaña origen
    data_entrevista TIMESTAMP,
    acords TEXT,
    any_curs TEXT NOT NULL REFERENCES cursos(any_curs) ON DELETE CASCADE,
    spreadsheet_id TEXT NOT NULL, -- ID del spreadsheet origen
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(alumne_id, curso_origen, pestana_origen, data_entrevista, spreadsheet_id)
);

CREATE INDEX IF NOT EXISTS idx_entrevistes_consolidadas_alumne ON entrevistes_consolidadas(alumne_id);
CREATE INDEX IF NOT EXISTS idx_entrevistes_consolidadas_curso ON entrevistes_consolidadas(curso_origen);
CREATE INDEX IF NOT EXISTS idx_entrevistes_consolidadas_pestana ON entrevistes_consolidadas(pestana_origen);
CREATE INDEX IF NOT EXISTS idx_entrevistes_consolidadas_any ON entrevistes_consolidadas(any_curs);

-- Tabla para logs de consolidación
CREATE TABLE IF NOT EXISTS consolidacion_logs (
    id TEXT PRIMARY KEY, -- ULID/UUID
    curso_nombre TEXT NOT NULL,
    spreadsheet_id TEXT NOT NULL,
    pestanas_procesadas INTEGER DEFAULT 0,
    alumnos_procesados INTEGER DEFAULT 0,
    entrevistas_importadas INTEGER DEFAULT 0,
    errores INTEGER DEFAULT 0,
    estado TEXT NOT NULL CHECK (estado IN ('iniciado','procesando','completado','error')),
    detalles JSONB,
    iniciado_por TEXT REFERENCES usuaris(email),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completado_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_consolidacion_logs_curso ON consolidacion_logs(curso_nombre);
CREATE INDEX IF NOT EXISTS idx_consolidacion_logs_estado ON consolidacion_logs(estado);

-- ========= Notas de integridad y reglas de negocio ========
-- - El alta/edición de entrevistes debe estar limitada a anyActual (aplicación).
-- - Al importar, garantizar alumne_id presente; si falta, generar ULID y registrar en auditoria.
-- - Entrevistes huérfanas: marcar estado 'pendent' en capa de aplicación y avisar.
-- - Duplicados PF: resolver en import según regla "más reciente gana" y registrar auditoria.
-- - Consolidación: normalizar nombres de alumnos antes de comparar/insertar.
-- - Consolidación: mantener historial de pestañas origen para trazabilidad.


