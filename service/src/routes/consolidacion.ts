import { Router } from 'express';
import { query } from '../db.js';
import { 
  normalizarNombre, 
  procesarFilaDeEntrevistas
} from '../utils/normalization.js';
import { createSheetsClient } from '../sheets/client.js';

const router = Router();

// ========= Tipus per a l'API =========
interface ConsolidacionPreview {
  curs: string;
  spreadsheetId: string;
  pestanyes: PestanaData[];
  alumnes: AlumneConsolidat[];
  totalEntrevistes: number;
}

interface PestanaData {
  nom: string;
  spreadsheetId: string;
  entrevistes: EntrevistaData[];
  totalEntrevistes: number;
}

interface EntrevistaData {
  nom: string;
  grup: string;
  tutor: string;
  infoExtra: string;
  entrevistes: string;
}

interface AlumneConsolidat {
  nom: string;
  grup: string;
  tutor: string;
  infoExtra: string;
  historial: Record<string, string>;
  totalEntrevistes: number;
}

interface ConsolidacionResult {
  exit: boolean;
  curs: string;
  alumnesProcessats: number;
  entrevistesImportades: number;
  errors: number;
  detalls: string;
}

// ========= Configuració de nivells educatius (del script GAS) =========
const NIVELS_EDUCATIUS = {
  '1r ESO': 1,
  '2n ESO': 2,
  '3r ESO': 3,
  '4t ESO': 4
};

// ========= Funció principal de consolidació (basada en script GAS) =========
async function consolidarEntrevistesPerCurs(curs: string): Promise<ConsolidacionResult> {
  try {
    // 1. Obtenir ID del spreadsheet per al curs des de configuració
    // Mapejar noms de curs a claus de configuració
    const cursConfigMap: Record<string, string> = {
      '1r ESO': '1rSpreadsheetId',
      '2n ESO': '2nSpreadsheetId', 
      '3r ESO': '3rSpreadsheetId',
      '4t ESO': '4tSpreadsheetId'
    };
    
    const configKey = cursConfigMap[curs];
    if (!configKey) {
      throw new Error(`Curs no suportat: ${curs}`);
    }
    
    const configResult = await query(`
      SELECT valor FROM config WHERE clave = $1
    `, [configKey]);
    
    if (configResult.rows.length === 0) {
      throw new Error(`No s'ha trobat configuració per al curs ${curs}`);
    }
    
    const spreadsheetId = configResult.rows[0].valor.replace(/"/g, '');
    console.log(`[CONSOLIDACION] Processant consolidació per a ${curs} amb ID: ${spreadsheetId}`);
    
    // 2. Obtenir any actual
    const anyCursResult = await query(`
      SELECT valor FROM config WHERE clave = 'anyActual'
    `);
    const anyCurs = anyCursResult.rows.length > 0 ? anyCursResult.rows[0].valor.replace(/"/g, '') : '2025-2026';
    
    // 3. Connectar a Google Sheets
    console.log(`[CONSOLIDACION] Connectant a Google Sheets...`);
    const sheetsClient = createSheetsClient();
    
    // 4. Obtenir totes les pestanyes del spreadsheet
    console.log(`[CONSOLIDACION] Obtenint informació del spreadsheet ${spreadsheetId}...`);
    const spreadsheetInfo = await sheetsClient.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    console.log(`[CONSOLIDACION] Spreadsheet obtingut. Pestanyes disponibles:`, spreadsheetInfo.data.sheets?.map((s: any) => s.properties?.title));
    
    const fullesDeCurs = spreadsheetInfo.data.sheets
      ?.filter((sheet: any) => {
        const nom = sheet.properties?.title || '';
        const isValid = NIVELS_EDUCATIUS[nom as keyof typeof NIVELS_EDUCATIUS] !== undefined;
        console.log(`[CONSOLIDACION] Pestanya "${nom}": ${isValid ? 'VÀLIDA' : 'NO VÀLIDA'}`);
        return isValid;
      })
      .sort((a: any, b: any) => {
        const nomA = a.properties?.title || '';
        const nomB = b.properties?.title || '';
        return NIVELS_EDUCATIUS[nomA as keyof typeof NIVELS_EDUCATIUS] - 
               NIVELS_EDUCATIUS[nomB as keyof typeof NIVELS_EDUCATIUS];
      }) || [];
    
    console.log(`[CONSOLIDACION] Pestanyes vàlides trobades:`, fullesDeCurs?.map((s: any) => s.properties?.title));
    
    if (fullesDeCurs.length === 0) {
      throw new Error(`No s'han trobat pestanyes de curs vàlides al spreadsheet`);
    }
    
    // 5. Trobar la pestanya del curs actual (la més alta)
    const fullaMesAlta = fullesDeCurs[fullesDeCurs.length - 1];
    const nomFullaActual = fullaMesAlta.properties?.title || '';
    
    console.log(`[CONSOLIDACION] Curs actual seleccionat: ${nomFullaActual}`);
    
    // 6. Crear llista mestra d'alumnes des de la pestanya del curs actual
    const dadesAlumnes = new Map<string, any>();
    
    const valorsFullaPrincipal = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${nomFullaActual}!A:Z`
    });
    
    if (!valorsFullaPrincipal.data.values || valorsFullaPrincipal.data.values.length < 4) {
      throw new Error(`La pestanya ${nomFullaActual} està buida o té format incorrecte`);
    }
    
    const valors = valorsFullaPrincipal.data.values;
    
    // Processar files de dades (començant des de la fila 4, índex 3)
    for (let i = 3; i < valors.length; i++) {
      const fila = valors[i];
      const nomOriginal = fila[3];
      const nomNormalitzat = normalizarNombre(nomOriginal);
      
      if (!nomNormalitzat) continue;
      
      dadesAlumnes.set(nomNormalitzat, {
        infoBasica: [fila[2], nomOriginal, fila[4], fila[5]], // grup, nom, tutor, infoExtra
        entrevistes: new Map()
      });
    }
    
    console.log(`Llista mestra creada amb ${dadesAlumnes.size} alumnes per a ${nomFullaActual}`);
    
    // 7. Recollir historial d'entrevistes de TOTES les pestanyes
    for (const fullaHistorica of fullesDeCurs) {
      const nomFullaHistorica = fullaHistorica.properties?.title || '';
      
      try {
        const valorsHistorics = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: `${nomFullaHistorica}!A:Z`
        });
        
        if (!valorsHistorics.data.values || valorsHistorics.data.values.length < 4) {
          console.warn(`Pestanya ${nomFullaHistorica} buida o amb format incorrecte`);
          continue;
        }
        
        console.log(`Cercant historial en: ${nomFullaHistorica}`);
        
        for (let i = 3; i < valorsHistorics.data.values.length; i++) {
          const filaHistorica = valorsHistorics.data.values[i];
          const nomHistoricNormalitzat = normalizarNombre(filaHistorica[3]);
          
          if (dadesAlumnes.has(nomHistoricNormalitzat)) {
            const entrevistesHistorial = procesarFilaDeEntrevistas(filaHistorica);
            if (entrevistesHistorial) {
              dadesAlumnes.get(nomHistoricNormalitzat).entrevistes.set(nomFullaHistorica, entrevistesHistorial);
            }
          }
        }
      } catch (error) {
        console.error(`Error processant pestanya ${nomFullaHistorica}:`, error);
        // Continuar amb les següents pestanyes
      }
    }
    
    // 8. Importar dades consolidades a la base de dades
    let alumnesProcessats = 0;
    let entrevistesImportades = 0;
    let errors = 0;
    
    // Obtenir un usuari admin per al log
    const adminResult = await query(`
      SELECT email FROM usuaris WHERE rol = 'admin' LIMIT 1
    `);
    const adminEmail = adminResult.rows.length > 0 ? adminResult.rows[0].email : 'system@consolidacion.local';
    
    // Crear log de consolidació (opcional, no crítico)
    let actualLogId = null;
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const logResult = await query(`
        INSERT INTO consolidacion_logs (id, curso_nombre, spreadsheet_id, pestanas_procesadas, alumnos_procesados, entrevistas_importadas, errores, estado, iniciado_por, detalles)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        logId,
        curs,
        spreadsheetId,
        fullesDeCurs.length,
        0, // s'actualitzarà després
        0, // s'actualitzarà després
        0, // s'actualitzarà després
        'procesando',
        adminEmail,
        JSON.stringify({ proces: 'consolidacio_automatica', curs_actual: nomFullaActual })
      ]);
      
      actualLogId = logResult.rows[0].id;
    } catch (logError) {
      console.warn('No es pot crear log de consolidació:', logError);
      // Continuar sense log
    }
    
    try {
      for (const [nomNormalitzat, dades] of dadesAlumnes) {
        try {
          // Buscar o crear alumne en BD
          let alumneId: string;
          
          const alumneResult = await query(`
            SELECT alumne_id FROM alumnes WHERE nom = $1
          `, [dades.infoBasica[1]]); // nom original
          
          if (alumneResult.rows.length > 0) {
            alumneId = alumneResult.rows[0].alumne_id;
          } else {
            // Crear nou alumne
            const nouAlumneResult = await query(`
              INSERT INTO alumnes (nom, grup, any_curs, estat)
              VALUES ($1, $2, $3, 'alta')
              RETURNING alumne_id
            `, [dades.infoBasica[1], dades.infoBasica[0], anyCurs]);
            
            alumneId = nouAlumneResult.rows[0].alumne_id;
          }
          
          // Processar historial d'entrevistes
          for (const [pestanyaNom, entrevistesText] of dades.entrevistes) {
            if (entrevistesText) {
              // Inserir entrevista consolidada
              await query(`
                INSERT INTO entrevistes_consolidadas (id, alumne_id, curso_origen, pestana_origen, data_entrevista, acords, any_curs, spreadsheet_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (alumne_id, curso_origen, pestana_origen, data_entrevista, spreadsheet_id) 
                DO NOTHING
              `, [
                `cons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                alumneId,
                curs,
                pestanyaNom,
                new Date(),
                entrevistesText,
                anyCurs,
                spreadsheetId
              ]);
              
              entrevistesImportades++;
            }
          }
          
          alumnesProcessats++;
          
        } catch (error) {
          console.error(`Error processant alumne ${nomNormalitzat}:`, error);
          errors++;
        }
      }
      
      // Actualitzar log amb resultats finals (si existeix)
      if (actualLogId) {
        try {
          await query(`
            UPDATE consolidacion_logs 
            SET estado = 'completado', 
                alumnos_procesados = $1,
                entrevistas_importadas = $2,
                errores = $3,
                completado_at = NOW()
            WHERE id = $4
          `, [alumnesProcessats, entrevistesImportades, errors, actualLogId]);
        } catch (logError) {
          console.warn('No es pot actualitzar log de consolidació:', logError);
        }
      }
      
      return {
        exit: true,
        curs,
        alumnesProcessats,
        entrevistesImportades,
        errors,
        detalls: `Consolidació completada per a ${curs}. ${alumnesProcessats} alumnes processats, ${entrevistesImportades} entrevistes importades.`
      };
      
    } catch (error) {
      // Marcar log com a error (si existeix)
      if (actualLogId) {
        try {
          await query(`
            UPDATE consolidacion_logs 
            SET estado = 'error', 
                errores = 1,
                detalles = $1,
                completado_at = NOW()
            WHERE id = $2
          `, [JSON.stringify({ error: (error as any).message }), actualLogId]);
        } catch (logError) {
          console.warn('No es pot actualitzar log de consolidació amb error:', logError);
        }
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('Error en consolidació:', error);
    return {
      exit: false,
      curs,
      alumnesProcessats: 0,
      entrevistesImportades: 0,
      errors: 1,
      detalls: `Error: ${(error as any).message}`
    };
  }
}

// ========= Endpoints de l'API =========

// GET /consolidacion/cursos - Obtenir cursos disponibles per a consolidació
router.get('/cursos', async (req, res) => {
  try {
    const cursos = [
      { nom: '1r ESO', descripcio: 'Primer curs d\'ESO' },
      { nom: '2n ESO', descripcio: 'Segon curs d\'ESO' },
      { nom: '3r ESO', descripcio: 'Tercer curs d\'ESO' },
      { nom: '4t ESO', descripcio: 'Quart curs d\'ESO' }
    ];
    
    res.json(cursos);
  } catch (error) {
    console.error('Error obtenint cursos:', error);
    res.status(500).json({ error: 'Error obtenint cursos disponibles' });
  }
});

// POST /consolidacion/init-config - Inicializar configuración para consolidación
router.post('/init-config', async (req, res) => {
  try {
    // Verificar si ya existe configuración
    const existingConfig = await query(`
      SELECT COUNT(*) as count FROM config WHERE clave = 'anyActual'
    `);
    
    if (existingConfig.rows[0].count > 0) {
      return res.json({ 
        message: 'Configuración ya existe', 
        status: 'exists' 
      });
    }
    
    // Insertar configuración básica
    await query(`
      INSERT INTO config (clave, valor) VALUES 
      ('anyActual', '"2025-2026"'),
      ('1rSpreadsheetId', '""'),
      ('2nSpreadsheetId', '""'),
      ('3rSpreadsheetId', '""'),
      ('4tSpreadsheetId', '""')
      ON CONFLICT (clave) DO NOTHING
    `);
    
    res.json({ 
      message: 'Configuración inicializada correctamente', 
      status: 'created' 
    });
  } catch (error) {
    console.error('Error inicializando configuración:', error);
    res.status(500).json({ 
      error: 'Error inicializando configuración',
      details: (error as any).message 
    });
  }
});

// POST /consolidacion/consolidar - Consolidar entrevistes per a un curs
router.post('/consolidar', async (req, res) => {
  try {
    const { curs } = req.body;
    
    if (!curs) {
      return res.status(400).json({ error: 'Falta especificar el curs' });
    }
    
    console.log(`Iniciant consolidació per a curs: ${curs}`);
    
    const resultat = await consolidarEntrevistesPerCurs(curs);
    
    if (resultat.exit) {
      res.json(resultat);
    } else {
      res.status(500).json(resultat);
    }
    
  } catch (error) {
    console.error('Error en consolidació:', error);
    res.status(500).json({ 
      error: 'Error en consolidació', 
      detalls: (error as any).message 
    });
  }
});

// GET /consolidacion/logs - Obtenir logs de consolidació
router.get('/logs', async (req, res) => {
  try {
    const { curs } = req.query;
    
    let queryString = `
      SELECT id, curso_nombre, spreadsheet_id, pestanas_procesadas, alumnos_procesados,
             entrevistas_importadas, errores, estado, detalles, iniciado_por, 
             created_at, completado_at
      FROM consolidacion_logs
    `;
    const params: any[] = [];
    
    if (curs) {
      queryString += ' WHERE curso_nombre = $1';
      params.push(curs);
    }
    
    queryString += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await query(queryString, params);
    
    const logs = result.rows.map((row: any) => ({
      id: row.id,
      cursNom: row.curso_nombre,
      spreadsheetId: row.spreadsheet_id,
      pestanyesProcessades: row.pestanas_procesadas,
      alumnesProcessats: row.alumnos_procesados,
      entrevistesImportades: row.entrevistas_importadas,
      errors: row.errores,
      estat: row.estado,
      detalls: row.detalles,
      iniciatPer: row.iniciado_por,
      creatAt: row.created_at,
      completatAt: row.completado_at
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Error obtenint logs:', error);
    res.status(500).json({ error: 'Error obtenint logs de consolidació' });
  }
});

// GET /consolidacion/entrevistas - Obtenir entrevistes consolidadas
router.get('/entrevistas', async (req, res) => {
  try {
    const { curs, pestanya, alumneId, anyCurs } = req.query;
    
    let queryString = `
      SELECT ec.id, ec.alumne_id, ec.curso_origen, ec.pestana_origen, 
             ec.data_entrevista, ec.acords, ec.any_curs, ec.spreadsheet_id,
             ec.created_at, ec.updated_at, a.nom as alumne_nom
      FROM entrevistes_consolidadas ec
      JOIN alumnes a ON ec.alumne_id = a.alumne_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;
    
    if (curs) {
      queryString += ` AND ec.curso_origen = $${paramCount++}`;
      params.push(curs);
    }
    if (pestanya) {
      queryString += ` AND ec.pestana_origen = $${paramCount++}`;
      params.push(pestanya);
    }
    if (alumneId) {
      queryString += ` AND ec.alumne_id = $${paramCount++}`;
      params.push(alumneId);
    }
    if (anyCurs) {
      queryString += ` AND ec.any_curs = $${paramCount++}`;
      params.push(anyCurs);
    }
    
    queryString += ' ORDER BY ec.data_entrevista DESC, a.nom';
    
    const result = await query(queryString, params);
    
    const entrevistes = result.rows.map((row: any) => ({
      id: row.id,
      alumneId: row.alumne_id,
      cursOrigen: row.curso_origen,
      pestanyaOrigen: row.pestana_origen,
      dataEntrevista: row.data_entrevista,
      acords: row.acords,
      anyCurs: row.any_curs,
      spreadsheetId: row.spreadsheet_id,
      creatAt: row.created_at,
      actualitzatAt: row.updated_at,
      alumneNom: row.alumne_nom
    }));
    
    res.json(entrevistes);
  } catch (error) {
    console.error('Error obtenint entrevistes consolidadas:', error);
    res.status(500).json({ error: 'Error obtenint entrevistes consolidadas' });
  }
});

export default router;