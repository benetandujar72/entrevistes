import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { query } from '../db.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { ulid } from 'ulid';

const router = Router();

// Configurar multer para archivos CSV
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

// Endpoint de prueba sin autenticación
router.get('/test', async (req: any, res: Response) => {
  console.log('🧪 ENDPOINT DE PRUEBA FUNCIONANDO');
  res.json({ message: 'Endpoint de prueba funcionando' });
});

// Endpoint de prueba más simple
router.get('/simple', async (req: any, res: Response) => {
  res.json({ message: 'Simple endpoint funcionando' });
});

// Endpoint para importar datos completos desde CSV (SIN AUTENTICACIÓN TEMPORAL)
router.post('/dades-complets', upload.single('csv'), async (req: any, res: Response) => {
  try {
    console.log(`🚀 INICIANDO IMPORTACIÓN COMPLETA`);
    console.log(`📁 Archivo recibido: ${req.file?.originalname} (${req.file?.size} bytes)`);
    console.log(`📅 Año curso: ${req.body.anyCurs || '2025-2026'}`);
    
    if (!req.file) {
      console.log(`❌ Error: No se ha proporcionado archivo CSV`);
      return res.status(400).json({ error: 'No se proporcionó archivo CSV' });
    }

    const anyCurs = req.body.anyCurs || '2025-2026';
    const csvData: any[] = [];

    // Parsear CSV
    const stream = Readable.from(req.file.buffer);
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({
          separator: ',',
          headers: [
            'numero', 'sexe', 'grup', 'alumne_nom', 'grup_alumne', 
            'tutor_personal', 'tutor_personal_email', 'mail_edu', 'email_alumnat',
            'ralc', 'doc_identitat', 'tis', 'data_naixement', 'municipi_naixement',
            'nacionalitat', 'adreca', 'municipi_residencia', 'cp',
            'tutor1_nom', 'tutor1_tel', 'tutor1_email',
            'tutor2_nom', 'tutor2_tel', 'tutor2_email', 'link_fotografia'
          ]
        }))
        .on('data', (row) => {
          // Limpiar datos y convertir a formato correcto
          const cleanRow: any = {};
          Object.keys(row).forEach(key => {
            let value = row[key]?.trim();
            // Limpiar comillas y espacios extra
            if (value && value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            }
            cleanRow[key] = value === '' || value === 'null' || value === 'NULL' ? null : value;
          });
          
          // Solo agregar si tiene datos mínimos Y no es la cabecera
          if (cleanRow.alumne_nom && cleanRow.grup && cleanRow.alumne_nom !== 'Alumn@') {
            csvData.push(cleanRow);
            console.log(`✅ Agregado: ${cleanRow.alumne_nom} (${cleanRow.grup})`);
          } else {
            console.log(`⚠️ Saltando línea: ${cleanRow.alumne_nom || 'SIN_NOMBRE'} (${cleanRow.grup || 'SIN_GRUPO'})`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Procesando ${csvData.length} líneas del CSV`);
    console.log(`📋 Primeras 3 líneas del CSV:`, csvData.slice(0, 3));

    let alumnesCreados = 0;
    let grupsCreados = 0;
    let tutoresAsignados = 0;
    let entrevistesCreadas = 0;
    let errores = 0;
    const totalAlumnes = csvData.length;

    // 1. Crear grupos únicos
    const grupsUnicos = [...new Set(csvData.map(row => row.grup).filter(Boolean))];
    console.log(`🏫 Grupos únicos encontrados:`, grupsUnicos);
    const grupsMap = new Map();

    for (const grupNom of grupsUnicos) {
      try {
        // Verificar si el grupo ya existe
        const existingGrup = await query(
          'SELECT grup_id FROM grups WHERE nom = $1',
          [grupNom]
        );

        let grupId: string;
        if (existingGrup.rows.length === 0) {
          // Crear nuevo grupo
          grupId = `grup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await query(
            'INSERT INTO grups (grup_id, nom, created_at) VALUES ($1, $2, NOW())',
            [grupId, grupNom]
          );
          grupsCreados++;
        } else {
          // Usar grupo existente
          grupId = existingGrup.rows[0].grup_id;
        }

        grupsMap.set(grupNom, grupId);
      } catch (error) {
        console.error(`Error creando grupo ${grupNom}:`, error);
        errores++;
      }
    }

    // 2. Procesar cada alumno
    console.log(`👥 Iniciando procesamiento de ${csvData.length} alumnos...`);
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        if (!row.alumne_nom) {
          console.log(`⚠️  Línea ${i + 1}: Sin nombre de alumno, saltando...`);
          continue;
        }
        
        console.log(`👤 Procesando alumno ${i + 1}/${csvData.length}: ${row.alumne_nom}`);
        
        // Verificar si el alumno ya existe
        const alumneExistente = await query('SELECT alumne_id FROM alumnes WHERE nom = $1', [row.alumne_nom]);
        if (alumneExistente.rows.length > 0) {
          console.log(`⚠️  Alumno ya existe: ${row.alumne_nom}, saltando...`);
          continue;
        }

        // Crear alumne_id único
        const alumneId = `alumne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Procesar fecha de nacimiento
        let dataNaixement = null;
        if (row.data_naixement) {
          try {
            // Intentar parsear diferentes formatos de fecha
            const date = new Date(row.data_naixement);
            if (!isNaN(date.getTime())) {
              dataNaixement = date.toISOString().split('T')[0]; // YYYY-MM-DD
            }
          } catch (error) {
            console.log(`⚠️  Error procesando fecha de nacimiento para ${row.alumne_nom}: ${error}`);
          }
        }

        // PRIMERO: Insertar datos personales en la tabla pf
        console.log(`📝 Insertando datos personales: ${row.alumne_nom}`);
        await query(`
          INSERT INTO pf (
            personal_id, sexe, data_naixement, municipi_naixement, nacionalitat,
            adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc,
            link_fotografia, tutor_personal_nom, tutor_personal_email,
            tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
          )
        `, [
          personalId, row.sexe, dataNaixement, row.municipi_naixement, row.nacionalitat,
          row.adreca, row.municipi_residencia, row.cp, row.doc_identitat, row.tis, row.ralc,
          row.link_fotografia, row.tutor_personal_nom, row.tutor_personal_email,
          row.tutor1_nom, row.tutor1_tel, row.tutor1_email, row.tutor2_nom, row.tutor2_tel, row.tutor2_email
        ]);

        // SEGUNDO: Insertar alumno
        console.log(`📝 Insertando alumno: ${row.alumne_nom} (${row.email_alumnat})`);
        await query(`
          INSERT INTO alumnes (alumne_id, nom, email, personal_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [alumneId, row.alumne_nom, row.email_alumnat, personalId]);
        console.log(`✅ Alumno insertado con ID: ${alumneId}`);

        // Asignar alumno a grupo
        const grupId = grupsMap.get(row.grup);
        if (grupId) {
          console.log(`🎓 Asignando ${row.alumne_nom} al grupo ${row.grup} (ID: ${grupId})`);
          await query(`
            INSERT INTO alumnes_curs (alumne_id, grup_id, any_curs, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [alumneId, grupId, anyCurs]);
          console.log(`✅ Alumno asignado al grupo: ${row.alumne_nom}`);
        } else {
          console.log(`⚠️  No se encontró grupo para ${row.alumne_nom}: ${row.grup}`);
        }

        // Asignar tutor académico
        if (row.tutor_personal_email) {
          console.log(`👨‍🏫 Asignando tutor ${row.tutor_personal} (${row.tutor_personal_email}) a ${row.alumne_nom}`);
          await query(`
            INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
          `, [alumneId, row.tutor_personal_email, anyCurs]);
          tutoresAsignados++;
          console.log(`✅ Tutor asignado: ${row.alumne_nom} → ${row.tutor_personal_email}`);
        } else {
          console.log(`⚠️  Sin tutor personal para ${row.alumne_nom}`);
        }

        // Crear entrevista inicial
        console.log(`📝 Creando entrevista inicial para: ${row.alumne_nom}`);
        await query(`
          INSERT INTO entrevistes (entrevista_id, alumne_id, any_curs, data, acords, usuari_creador_id, created_at)
          VALUES ($1, $2, $3, NOW(), $4, $5, NOW())
        `, [
          `entrevista_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          alumneId,
          anyCurs,
          'Entrevista inicial creada automáticamente',
          req.user?.email || 'system'
        ]);
        entrevistesCreadas++;
        console.log(`✅ Entrevista inicial creada para: ${row.alumne_nom}`);

        alumnesCreados++;
        console.log(`✅ ${row.alumne_nom} → ${row.grup} → ${row.tutor_personal_email || 'Sin tutor'}`);

        // Log de progreso cada 10 alumnos
        if (alumnesCreados % 10 === 0) {
          const progress = Math.round((alumnesCreados / totalAlumnes) * 100);
          console.log(`📊 Progreso: ${progress}% (${alumnesCreados}/${totalAlumnes} alumnes)`);
        }

      } catch (error: any) {
        console.error(`❌ Error procesando alumno ${row.alumne_nom}:`, error);
        console.error(`❌ Detalles del error:`, {
          alumne: row.alumne_nom,
          email: row.email_alumnat,
          grup: row.grup,
          error: error?.message || 'Error desconocido'
        });
        errores++;
      }
    }

    console.log(`🎉 IMPORTACIÓN COMPLETADA:`);
    console.log(`📊 Resumen final:`);
    console.log(`   - Alumnes: ${alumnesCreados}`);
    console.log(`   - Grups: ${grupsCreados}`);
    console.log(`   - Tutores: ${tutoresAsignados}`);
    console.log(`   - Entrevistes: ${entrevistesCreadas}`);
    console.log(`   - Errores: ${errores}`);

    res.json({
      success: true,
      alumnes: alumnesCreados,
      grups: grupsCreados,
      tutores: tutoresAsignados,
      entrevistes: entrevistesCreadas,
      errores
    });

  } catch (error) {
    console.error('Error en importación completa:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para crear un alumno individual con datos JSON
router.post('/alumne-individual', requireAuth(), async (req: Request, res: Response) => {
  try {
    console.log(`📝 Creando alumno individual: ${req.body.alumne_nom}`);
    console.log(`🔍 Grupo recibido del frontend:`, req.body.grup);
    
    const {
      alumne_id,
      personal_id,
      alumne_nom,
      email_alumnat,
      sexe,
      data_naixement,
      municipi_naixement,
      nacionalitat,
      adreca,
      municipi_residencia,
      cp,
      doc_identitat,
      tis,
      ralc,
      link_fotografia,
      tutor_personal_nom,
      tutor_personal_email,
      tutor1_nom,
      tutor1_tel,
      tutor1_email,
      tutor2_nom,
      tutor2_tel,
      tutor2_email,
      grup = '1r ESO',
      anyCurs = '2025-2026'
    } = req.body;

    // Procesar fecha de nacimiento
    let dataNaixement = null;
    if (data_naixement) {
      try {
        const date = new Date(data_naixement);
        if (!isNaN(date.getTime())) {
          dataNaixement = date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } catch (error) {
        console.log(`⚠️  Error procesando fecha de nacimiento para ${alumne_nom}: ${error}`);
      }
    }

    // Asegurar que el curso existe primero
    await query(`
      INSERT INTO cursos (any_curs)
      VALUES ($1)
      ON CONFLICT (any_curs) DO NOTHING
    `, [anyCurs]);

    // Determinar el curso basado en el grupo
    const determinarCurso = (grupo: string): string => {
      if (grupo.match(/^1[ABC]$/)) return '1r ESO';
      if (grupo.match(/^2[ABC]$/)) return '2n ESO';
      if (grupo.match(/^3[ABC]$/)) return '3r ESO';
      if (grupo.match(/^4[ABC]$/)) return '4t ESO';
      if (grupo.match(/^1[ABC]BAT$/)) return '1r BAT';
      if (grupo.match(/^2[ABC]BAT$/)) return '2n BAT';
      return '1r ESO'; // Curso por defecto
    };

    const cursoDelGrupo = determinarCurso(grup);
    
    // Crear grupo con el nombre exacto del CSV (1A, 1B, 1C, etc.)
    const grupId = `${grup}_${anyCurs}`;
    await query(`
      INSERT INTO grups (grup_id, any_curs, curs, nom)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (grup_id) DO NOTHING
    `, [grupId, anyCurs, cursoDelGrupo, grup]);

    // Verificar si el alumno ya existe por email
    const alumneExistente = await query('SELECT alumne_id, personal_id FROM alumnes WHERE email = $1', [email_alumnat]);
    
    let alumneIdFinal = alumne_id;
    let personalIdFinal = personal_id;
    
    if (alumneExistente.rows.length > 0) {
      // Alumno ya existe, usar IDs existentes
      alumneIdFinal = alumneExistente.rows[0].alumne_id;
      personalIdFinal = alumneExistente.rows[0].personal_id;
      console.log(`🔄 Actualizando alumno existente: ${alumne_nom} (${email_alumnat})`);
    } else {
      console.log(`➕ Creando nuevo alumno: ${alumne_nom} (${email_alumnat})`);
      // Generar personal_id si no se proporciona
      if (!personalIdFinal) {
        personalIdFinal = ulid();
        console.log(`🆔 Generado personal_id: ${personalIdFinal}`);
      }
    }

    // Insertar/actualizar datos personales
    await query(`
      INSERT INTO pf (
        personal_id, sexe, data_naixement, municipi_naixement, nacionalitat,
        adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc,
        link_fotografia, tutor_personal_nom, tutor_personal_email,
        tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      )
      ON CONFLICT (personal_id) DO UPDATE SET
        sexe = EXCLUDED.sexe,
        data_naixement = EXCLUDED.data_naixement,
        municipi_naixement = EXCLUDED.municipi_naixement,
        nacionalitat = EXCLUDED.nacionalitat,
        adreca = EXCLUDED.adreca,
        municipi_residencia = EXCLUDED.municipi_residencia,
        codi_postal = EXCLUDED.codi_postal,
        doc_identitat = EXCLUDED.doc_identitat,
        tis = EXCLUDED.tis,
        ralc = EXCLUDED.ralc,
        link_fotografia = EXCLUDED.link_fotografia,
        tutor_personal_nom = EXCLUDED.tutor_personal_nom,
        tutor_personal_email = EXCLUDED.tutor_personal_email,
        tutor1_nom = EXCLUDED.tutor1_nom,
        tutor1_tel = EXCLUDED.tutor1_tel,
        tutor1_email = EXCLUDED.tutor1_email,
        tutor2_nom = EXCLUDED.tutor2_nom,
        tutor2_tel = EXCLUDED.tutor2_tel,
        tutor2_email = EXCLUDED.tutor2_email,
        updated_at = NOW()
    `, [
      personalIdFinal, sexe, dataNaixement, municipi_naixement, nacionalitat,
      adreca, municipi_residencia, cp, doc_identitat, tis, ralc,
      link_fotografia, tutor_personal_nom, tutor_personal_email,
      tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email
    ]);

    // Insertar/actualizar alumno
    await query(`
      INSERT INTO alumnes (alumne_id, nom, email, personal_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (alumne_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        email = EXCLUDED.email,
        personal_id = EXCLUDED.personal_id,
        updated_at = NOW()
    `, [alumneIdFinal, alumne_nom, email_alumnat, personalIdFinal]);

    // Asignar/actualizar alumno a grupo
    const alumnesCursId = `ac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await query(`
      INSERT INTO alumnes_curs (id, alumne_id, grup_id, any_curs, estat)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (alumne_id, any_curs) DO UPDATE SET
        grup_id = EXCLUDED.grup_id,
        estat = EXCLUDED.estat,
        updated_at = NOW()
    `, [alumnesCursId, alumneIdFinal, grupId, anyCurs, 'alta']);

    // Crear/actualizar tutor académico si existe
    if (tutor_personal_email) {
      try {
        // Verificar si el tutor existe en la tabla usuaris
        const tutorExists = await query('SELECT email FROM usuaris WHERE email = $1', [tutor_personal_email]);
        
        if (tutorExists.rows.length === 0) {
          // Crear usuario si no existe
          await query(`
            INSERT INTO usuaris (email, rol)
            VALUES ($1, $2)
            ON CONFLICT (email) DO NOTHING
          `, [tutor_personal_email, 'docent']);
          console.log(`✅ Usuario creado: ${tutor_personal_email}`);
        } else {
          console.log(`✅ Usuario ya existe: ${tutor_personal_email}`);
        }
        
        // Asignar tutor al alumno
        await query(`
          INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs)
          VALUES ($1, $2, $3)
          ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
        `, [alumneIdFinal, tutor_personal_email, anyCurs]);
        console.log(`✅ Tutor asignado: ${tutor_personal_email} → ${alumne_nom}`);
        
      } catch (error) {
        console.log(`⚠️  Error procesando tutor ${tutor_personal_email}: ${error}`);
      }
    }

    console.log(`✅ Alumno creado: ${alumne_nom} (ID: ${alumne_id})`);
    res.json({ 
      success: true, 
      alumne_id, 
      personal_id, 
      message: `Alumno ${alumne_nom} creado correctamente` 
    });

  } catch (error: any) {
    console.error('Error creando alumno individual:', error);
    res.status(500).json({ 
      error: 'Error creando alumno', 
      details: error.message 
    });
  }
});

export default router;