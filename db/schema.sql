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
    sexe TEXT CHECK (sexe IN ('M','F','X') OR sexe IS NULL),
    data_naixement DATE,
    tutor1_nom TEXT,
    tutor1_tel TEXT,
    tutor1_email TEXT,
    tutor2_nom TEXT,
    tutor2_tel TEXT,
    tutor2_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========= Alumnes (identidad estable) ========
CREATE TABLE IF NOT EXISTS alumnes (
    alumne_id TEXT PRIMARY KEY, -- ULID/UUID estable en todos los cursos
    nom TEXT NOT NULL,
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

-- ========= Notas de integridad y reglas de negocio ========
-- - El alta/edición de entrevistes debe estar limitada a anyActual (aplicación).
-- - Al importar, garantizar alumne_id presente; si falta, generar ULID y registrar en auditoria.
-- - Entrevistes huérfanas: marcar estado 'pendent' en capa de aplicación y avisar.
-- - Duplicados PF: resolver en import según regla "más reciente gana" y registrar auditoria.


