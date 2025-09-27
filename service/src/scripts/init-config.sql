-- Script para inicializar la configuración necesaria para la consolidación
-- Este script debe ejecutarse después de crear la base de datos

-- Crear tabla config si no existe
CREATE TABLE IF NOT EXISTS config (
    clave VARCHAR(255) PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración básica para consolidación
INSERT INTO config (clave, valor, descripcion) VALUES 
('anyActual', '"2025-2026"', 'Año académico actual'),
('1rSpreadsheetId', '""', 'ID del spreadsheet para 1r ESO'),
('2nSpreadsheetId', '""', 'ID del spreadsheet para 2n ESO'),
('3rSpreadsheetId', '""', 'ID del spreadsheet para 3r ESO'),
('4tSpreadsheetId', '""', 'ID del spreadsheet para 4t ESO')
ON CONFLICT (clave) DO UPDATE SET 
    valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    updated_at = NOW();

-- Crear tabla consolidacion_logs si no existe
CREATE TABLE IF NOT EXISTS consolidacion_logs (
    id VARCHAR(255) PRIMARY KEY,
    curso_nombre VARCHAR(100) NOT NULL,
    spreadsheet_id VARCHAR(255),
    pestanas_procesadas INTEGER DEFAULT 0,
    alumnos_procesados INTEGER DEFAULT 0,
    entrevistas_importadas INTEGER DEFAULT 0,
    errores INTEGER DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'pendiente',
    detalles TEXT,
    iniciado_por VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    completado_at TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_consolidacion_logs_curso ON consolidacion_logs(curso_nombre);
CREATE INDEX IF NOT EXISTS idx_consolidacion_logs_estado ON consolidacion_logs(estado);
CREATE INDEX IF NOT EXISTS idx_consolidacion_logs_created_at ON consolidacion_logs(created_at);
