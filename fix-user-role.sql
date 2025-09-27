-- Crear usuario administrador
INSERT INTO usuaris (email, rol, created_at) 
VALUES ('benet.andujar@insbitacola.cat', 'admin', NOW()) 
ON CONFLICT (email) DO UPDATE SET rol = 'admin';

-- También crear como docente para acceso a rutas de docente
INSERT INTO usuaris (email, rol, created_at) 
VALUES ('benet.andujar@insbitacola.cat', 'docent', NOW()) 
ON CONFLICT (email) DO UPDATE SET rol = 'docent';

-- Verificar usuarios
SELECT email, rol FROM usuaris;
