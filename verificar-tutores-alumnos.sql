-- Script para verificar y mostrar la asignación de alumnos a tutores

-- 1. Verificar tutores existentes
SELECT 
    'TUTORES' as tipo,
    email,
    nom,
    cognoms,
    role
FROM usuaris 
WHERE role = 'docent'
ORDER BY cognoms, nom;

-- 2. Verificar alumnos existentes
SELECT 
    'ALUMNOS' as tipo,
    alumne_id,
    nom,
    cognoms,
    curs,
    grup
FROM alumnes 
ORDER BY cognoms, nom;

-- 3. Verificar asignaciones actuales
SELECT 
    'ASIGNACIONES' as tipo,
    ta.tutor_email,
    u.nom || ' ' || u.cognoms as tutor_nom,
    COUNT(ta.alumne_id) as total_alumnos
FROM tutories_alumne ta
JOIN usuaris u ON ta.tutor_email = u.email
WHERE ta.any_curs = '2025-2026'
GROUP BY ta.tutor_email, u.nom, u.cognoms
ORDER BY u.cognoms, u.nom;

-- 4. Mostrar alumnos por tutor
SELECT 
    'ALUMNOS_POR_TUTOR' as tipo,
    u.nom || ' ' || u.cognoms as tutor_nom,
    u.email as tutor_email,
    a.nom || ' ' || a.cognoms as alumno_nom,
    a.curs,
    a.grup
FROM usuaris u
LEFT JOIN tutories_alumne ta ON u.email = ta.tutor_email AND ta.any_curs = '2025-2026'
LEFT JOIN alumnes a ON ta.alumne_id = a.alumne_id
WHERE u.role = 'docent'
ORDER BY u.cognoms, u.nom, a.cognoms, a.nom;

-- 5. Estadísticas
SELECT 
    'ESTADISTICAS' as tipo,
    COUNT(DISTINCT ta.tutor_email) as total_tutores_con_alumnos,
    COUNT(ta.alumne_id) as total_alumnos_asignados,
    ROUND(AVG(COUNT(ta.alumne_id)) OVER(), 2) as promedio_alumnos_por_tutor
FROM tutories_alumne ta
WHERE ta.any_curs = '2025-2026'
GROUP BY ta.tutor_email;
