-- Script para asignar alumnos a tutores de forma más realista
-- Basado en los datos existentes en la base de datos

-- Primero, verificar qué tutores y alumnos tenemos
SELECT 'TUTORES DISPONIBLES:' as info;
SELECT email, nom, cognoms FROM usuaris WHERE role = 'docent' ORDER BY cognoms, nom;

SELECT 'ALUMNOS DISPONIBLES:' as info;
SELECT alumne_id, nom, cognoms, curs, grup FROM alumnes ORDER BY cognoms, nom;

-- Asignar más alumnos a los tutores existentes
-- (Esto asume que ya hay algunos datos de prueba)

-- Si no hay suficientes asignaciones, crear algunas más
INSERT INTO tutories_alumne(alumne_id, tutor_email, any_curs) 
SELECT 
    a.alumne_id,
    u.email,
    '2025-2026'
FROM alumnes a
CROSS JOIN usuaris u
WHERE u.role = 'docent'
AND NOT EXISTS (
    SELECT 1 FROM tutories_alumne ta 
    WHERE ta.alumne_id = a.alumne_id 
    AND ta.any_curs = '2025-2026'
)
-- Limitar a 5 alumnos por tutor para evitar sobrecarga
AND (
    SELECT COUNT(*) 
    FROM tutories_alumne ta2 
    WHERE ta2.tutor_email = u.email 
    AND ta2.any_curs = '2025-2026'
) < 5
-- Ordenar para distribución equitativa
ORDER BY 
    u.email,
    a.cognoms,
    a.nom
LIMIT 20; -- Máximo 20 asignaciones nuevas

-- Mostrar el resultado final
SELECT 'ASIGNACIONES FINALES:' as info;
SELECT 
    u.nom || ' ' || u.cognoms as tutor_nom,
    u.email as tutor_email,
    COUNT(ta.alumne_id) as total_alumnos,
    STRING_AGG(a.nom || ' ' || a.cognoms, ', ' ORDER BY a.cognoms, a.nom) as alumnos
FROM usuaris u
LEFT JOIN tutories_alumne ta ON u.email = ta.tutor_email AND ta.any_curs = '2025-2026'
LEFT JOIN alumnes a ON ta.alumne_id = a.alumne_id
WHERE u.role = 'docent'
GROUP BY u.email, u.nom, u.cognoms
ORDER BY u.cognoms, u.nom;
