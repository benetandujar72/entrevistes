-- Script para restaurar datos completos
-- Este script restaura todos los datos de prueba

-- Limpiar datos existentes
DELETE FROM entrevistes;
DELETE FROM tutories_alumne;
DELETE FROM alumnes_curs;
DELETE FROM alumnes;
DELETE FROM pf;
DELETE FROM usuaris;
DELETE FROM grups;
DELETE FROM cursos;

-- Insertar usuarios
INSERT INTO usuaris(email, rol) VALUES 
('benet.andujar@insbitacola.cat', 'admin'),
('albert.parrilla@insbitacola.cat', 'docent'),
('blanca.pi@insbitacola.cat', 'docent'),
('dani.palau@insbitacola.cat', 'docent'),
('laia.giner@insbitacola.cat', 'docent'),
('rony.castillo@insbitacola.cat', 'docent'),
('xavi.reyes@insbitacola.cat', 'docent');

-- Insertar curso
INSERT INTO cursos(any_curs) VALUES ('2025-2026');

-- Insertar grupos
INSERT INTO grups(grup_id, any_curs, curs, nom) VALUES 
('1A_2025-2026', '2025-2026', '1r', '1A'),
('1B_2025-2026', '2025-2026', '1r', '1B'),
('2A_2025-2026', '2025-2026', '2n', '2A'),
('2B_2025-2026', '2025-2026', '2n', '2B'),
('3A_2025-2026', '2025-2026', '3r', '3A'),
('3B_2025-2026', '2025-2026', '3r', '3B'),
('4A_2025-2026', '2025-2026', '4t', '4A'),
('4B_2025-2026', '2025-2026', '4t', '4B'),
('4C_2025-2026', '2025-2026', '4t', '4C');

-- Insertar alumnos
INSERT INTO alumnes(alumne_id, nom, email) VALUES 
('alumne_001', 'Albors Cano, Irene', 'irene.albors@insbitacola.cat'),
('alumne_002', 'Barresi Carrazo, Giulia', 'giulia.barresi@insbitacola.cat'),
('alumne_003', 'Benatia Kaddouri, Nour', 'nour.benatia@insbitacola.cat'),
('alumne_004', 'Chen Zhou, Javi', 'javi.chen@insbitacola.cat'),
('alumne_005', 'El Mesaoudi, Yassine', 'yassine.elmesaoudi@insbitacola.cat'),
('alumne_006', 'Esquivel Isla, Maria', 'maria.esquivel@insbitacola.cat'),
('alumne_007', 'Fernandez Sacristan, Sara', 'sara.fernandez@insbitacola.cat'),
('alumne_008', 'Flores Pardo, Alvaro', 'alvaro.flores@insbitacola.cat'),
('alumne_009', 'Fluja Sanchez, Dune', 'dune.fluja@insbitacola.cat'),
('alumne_010', 'Giralt Salguero, Oriol', 'oriol.giralt@insbitacola.cat');

-- Insertar datos personales
INSERT INTO pf(personal_id, sexe, data_naixement, municipi_naixement, nacionalitat, adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc, tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email) VALUES 
('pf_001', 'D', '2010-06-25', 'Barbera del Valles', 'Espanya', 'CT De Barcelona, 99 2n 3a', 'Barbera del Valles', '8210', '47244750J', 'ALCA1100625010', '12360456471', 'Cano Perez, Veronica', '622858875', 'vero.cano.perez@gmail.com', NULL, NULL, NULL),
('pf_002', 'D', '2010-03-23', 'Barbera del Valles', 'Espanya', 'CR Isaac Albeniz, 46-48 1r 1a', 'Barbera del Valles', '8210', '49378413N', 'BACA1100323002', '13001866486', 'Barresi, Ignacio Matias', '650383468', 'ignabarresi@gmail.com', 'Carrazo Silva, Azucena', '618278026', 'azucenasusy@gmail.com'),
('pf_003', 'D', '2010-07-25', 'Barbera del Valles', 'Espanya', 'AV Verge de Montserrat, 42 2n 2a', 'Barbera del Valles', '8210', '49346224T', 'BEKA1100725001', '20165992974', 'Benatia El Ouahidi, Allal', '696157377', 'madrid.9@hotmail.com', 'Kaddouri, Zineb', '602181260', 'anassebenatia11@gmail.com'),
('pf_004', 'H', '2010-11-27', 'Barbera del Valles', 'Espanya', 'AV Generalitat, 37 1r 2a', 'Barbera del Valles', '8210', 'G791280', 'CHZH101127001', '20165992974', 'Zhou, Chen', '688448887', 'chen.zhou@gmail.com', NULL, NULL, NULL),
('pf_005', 'H', '2010-01-15', 'Barbera del Valles', 'Espanya', 'CR Pirineus, 99', 'Barbera del Valles', '8210', '49378413N', 'ELME100115001', '13001866486', 'El Mesaoudi, Ahmed', '650383468', 'ahmed.elmesaoudi@gmail.com', NULL, NULL, NULL);

-- Vincular alumnos con datos personales
UPDATE alumnes SET personal_id = 'pf_001' WHERE alumne_id = 'alumne_001';
UPDATE alumnes SET personal_id = 'pf_002' WHERE alumne_id = 'alumne_002';
UPDATE alumnes SET personal_id = 'pf_003' WHERE alumne_id = 'alumne_003';
UPDATE alumnes SET personal_id = 'pf_004' WHERE alumne_id = 'alumne_004';
UPDATE alumnes SET personal_id = 'pf_005' WHERE alumne_id = 'alumne_005';

-- Insertar alumnos en cursos
INSERT INTO alumnes_curs(id, alumne_id, any_curs, grup_id, estat) VALUES 
('ac_001', 'alumne_001', '2025-2026', '4A_2025-2026', 'alta'),
('ac_002', 'alumne_002', '2025-2026', '4A_2025-2026', 'alta'),
('ac_003', 'alumne_003', '2025-2026', '4A_2025-2026', 'alta'),
('ac_004', 'alumne_004', '2025-2026', '4A_2025-2026', 'alta'),
('ac_005', 'alumne_005', '2025-2026', '4A_2025-2026', 'alta'),
('ac_006', 'alumne_006', '2025-2026', '4A_2025-2026', 'alta'),
('ac_007', 'alumne_007', '2025-2026', '4A_2025-2026', 'alta'),
('ac_008', 'alumne_008', '2025-2026', '4A_2025-2026', 'alta'),
('ac_009', 'alumne_009', '2025-2026', '4A_2025-2026', 'alta'),
('ac_010', 'alumne_010', '2025-2026', '4A_2025-2026', 'alta');

-- Insertar tutorías
INSERT INTO tutories_alumne(alumne_id, tutor_email, any_curs) VALUES 
('alumne_001', 'xavi.reyes@insbitacola.cat', '2025-2026'),
('alumne_002', 'blanca.pi@insbitacola.cat', '2025-2026'),
('alumne_003', 'blanca.pi@insbitacola.cat', '2025-2026'),
('alumne_004', 'xavi.reyes@insbitacola.cat', '2025-2026'),
('alumne_005', 'xavi.reyes@insbitacola.cat', '2025-2026'),
('alumne_006', 'xavi.reyes@insbitacola.cat', '2025-2026'),
('alumne_007', 'blanca.pi@insbitacola.cat', '2025-2026'),
('alumne_008', 'blanca.pi@insbitacola.cat', '2025-2026'),
('alumne_009', 'xavi.reyes@insbitacola.cat', '2025-2026'),
('alumne_010', 'blanca.pi@insbitacola.cat', '2025-2026');

-- Insertar entrevistas
INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id) VALUES 
('ent_001', 'alumne_001', '2025-2026', '2025-09-15', 'Revisio del rendiment academic. L''alumna mostra bones notes en matematiques.', 'benet.andujar@insbitacola.cat'),
('ent_002', 'alumne_002', '2025-2026', '2025-09-16', 'Conversa sobre l''adaptacio al nou curs. La familia esta satisfeta amb el progres.', 'xavi.reyes@insbitacola.cat'),
('ent_003', 'alumne_003', '2025-2026', '2025-09-17', 'Revisio de les dificultats en angles. S''han establert objectius per millorar.', 'blanca.pi@insbitacola.cat');

-- Insertar citas de calendario de ejemplo
INSERT INTO cites_calendari(id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts, nom_familia, email_familia, telefon_familia, estat, notes) VALUES 
('cita_001', 'alumne_001', 'xavi.reyes@insbitacola.cat', '2025-2026', '2025-09-25 10:00:00+02', 30, 'Cano Perez, Veronica', 'vero.cano.perez@gmail.com', '622858875', 'confirmada', 'Revisio del progrés acadèmic'),
('cita_002', 'alumne_002', 'blanca.pi@insbitacola.cat', '2025-2026', '2025-09-26 15:30:00+02', 45, 'Barresi, Ignacio Matias', 'ignabarresi@gmail.com', '650383468', 'pendent', 'Conversa sobre orientació acadèmica'),
('cita_003', 'alumne_003', 'blanca.pi@insbitacola.cat', '2025-2026', '2025-09-27 09:00:00+02', 30, 'Benatia El Ouahidi, Allal', 'madrid.9@hotmail.com', '696157377', 'realitzada', 'Revisió de dificultats en anglès');
