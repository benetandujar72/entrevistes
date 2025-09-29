// Script para importar TODOS los datos personales desde CSV
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('📊 IMPORTACIÓN MASIVA DE DATOS PERSONALES');
console.log('========================================\n');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
};

// Leer el CSV original
const csvPath = path.join(__dirname, 'Dades alumnat curs 25-26 - Full-Benet (1).csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log(`📁 CSV cargado: ${csvPath}`);
console.log(`📊 Total de líneas: ${lines.length}`);

// Función para parsear CSV correctamente
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/"/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/"/g, ''));
    return result;
}

// Función para convertir fecha
function convertirFecha(fechaStr) {
    if (!fechaStr) return null;
    try {
        const [dia, mes, año] = fechaStr.split('/');
        return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } catch (error) {
        return null;
    }
}

// Función para importar datos
async function importarTodosDatos() {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');
        
        // Obtener todos los alumnos de la base de datos
        const alumnosResult = await client.query(`
            SELECT a.alumne_id, a.nom, a.email 
            FROM alumnes a
            JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id
            WHERE ac.any_curs = '2025-2026' AND ac.estat = 'alta'
        `);
        
        console.log(`👥 Alumnos en BD: ${alumnosResult.rows.length}`);
        
        // Crear mapa de nombres para búsqueda
        const alumnosMap = new Map();
        alumnosResult.rows.forEach(alumno => {
            const nombreNormalizado = alumno.nom.toLowerCase().trim();
            alumnosMap.set(nombreNormalizado, alumno);
        });
        
        let importados = 0;
        let errores = 0;
        const erroresDetalle = [];
        
        console.log('\n🔄 Procesando datos del CSV...');
        
        for (let i = 2; i < lines.length; i++) { // Empezar desde la línea 3
            if (lines[i].trim()) {
                const values = parseCSVLine(lines[i]);
                
                if (values.length >= 25) {
                    try {
                        const dato = {
                            alumne_nom: values[3],
                            sexe: values[1] === 'H' ? 'H' : values[1] === 'D' ? 'D' : 'X',
                            data_naixement: convertirFecha(values[12]),
                            municipi_naixement: values[13],
                            nacionalitat: values[14],
                            adreca: values[15],
                            municipi_residencia: values[16],
                            codi_postal: values[17],
                            doc_identitat: values[10],
                            tis: values[11],
                            ralc: values[9],
                            link_fotografia: values[24] || null,
                            tutor1_nom: values[18],
                            tutor1_tel: values[19],
                            tutor1_email: values[20],
                            tutor2_nom: values[21],
                            tutor2_tel: values[22],
                            tutor2_email: values[23]
                        };
                        
                        // Buscar alumno por nombre (búsqueda flexible)
                        const nombreNormalizado = dato.alumne_nom.toLowerCase().trim();
                        let alumno = alumnosMap.get(nombreNormalizado);
                        
                        // Si no se encuentra exacto, buscar por similitud
                        if (!alumno) {
                            for (const [nombre, alumnoData] of alumnosMap.entries()) {
                                if (nombre.includes(nombreNormalizado.split(' ')[0]) || 
                                    nombreNormalizado.includes(nombre.split(' ')[0])) {
                                    alumno = alumnoData;
                                    break;
                                }
                            }
                        }
                        
                        if (!alumno) {
                            // Si no se encuentra el alumno, crearlo
                            console.log(`🆕 Creando alumno nuevo: ${dato.alumne_nom}`);
                            
                            const alumneId = `alumne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            
                            // Insertar alumne
                            await client.query(
                                'INSERT INTO alumnes (alumne_id, nom) VALUES ($1, $2)',
                                [alumneId, dato.alumne_nom]
                            );
                            
                            // Crear alumno para el mapa
                            alumno = {
                                alumne_id: alumneId,
                                nom: dato.alumne_nom
                            };
                            
                            // Afegir al mapa per futures referències
                            alumnosMap.set(nombreNormalizado, alumno);
                            
                            // Afegir al curs si hi ha grup
                            const grupCSV = values[2]?.trim();
                            if (grupCSV) {
                                // Buscar o crear grup
                                let grupResult = await client.query('SELECT grup_id FROM grups WHERE nom = $1', [grupCSV]);
                                
                                if (grupResult.rows.length === 0) {
                                    // Crear grup nou
                                    const grupId = `grup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                    const anyCurs = '2025-2026';
                                    const curs = grupCSV.charAt(0) + 'r ESO';
                                    
                                    await client.query(
                                        'INSERT INTO grups (grup_id, any_curs, curs, nom) VALUES ($1, $2, $3, $4)',
                                        [grupId, anyCurs, curs, grupCSV]
                                    );
                                    
                                    grupResult = { rows: [{ grup_id: grupId }] };
                                }
                                
                                // Afegir alumne al curs
                                const alumneCursId = `ac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                await client.query(
                                    'INSERT INTO alumnes_curs (alumne_curs_id, alumne_id, grup_id, any_curs) VALUES ($1, $2, $3, $4)',
                                    [alumneCursId, alumneId, grupResult.rows[0].grup_id, '2025-2026']
                                );
                            }
                        }
                        
                        const personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Insertar datos personales
                        await client.query(`
                            INSERT INTO pf (
                                personal_id, sexe, data_naixement, municipi_naixement, nacionalitat,
                                adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc,
                                link_fotografia, tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom,
                                tutor2_tel, tutor2_email
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
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
                                tutor1_nom = EXCLUDED.tutor1_nom,
                                tutor1_tel = EXCLUDED.tutor1_tel,
                                tutor1_email = EXCLUDED.tutor1_email,
                                tutor2_nom = EXCLUDED.tutor2_nom,
                                tutor2_tel = EXCLUDED.tutor2_tel,
                                tutor2_email = EXCLUDED.tutor2_email,
                                updated_at = NOW()
                        `, [
                            personalId, dato.sexe, dato.data_naixement, dato.municipi_naixement, dato.nacionalitat,
                            dato.adreca, dato.municipi_residencia, dato.codi_postal, dato.doc_identitat, dato.tis, dato.ralc,
                            dato.link_fotografia, dato.tutor1_nom, dato.tutor1_tel, dato.tutor1_email, dato.tutor2_nom,
                            dato.tutor2_tel, dato.tutor2_email
                        ]);
                        
                        // Actualizar referencia en tabla alumnes
                        await client.query(
                            'UPDATE alumnes SET personal_id = $1 WHERE alumne_id = $2',
                            [personalId, alumno.alumne_id]
                        );
                        
                        importados++;
                        console.log(`✅ ${dato.alumne_nom} → ${alumno.nom} - Datos importados`);
                        
                    } catch (error) {
                        errores++;
                        erroresDetalle.push(`${values[3]}: ${error.message}`);
                        console.log(`❌ Error: ${values[3]}: ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`\n📊 RESULTADO FINAL:`);
        console.log(`✅ Importados: ${importados}`);
        console.log(`❌ Errores: ${errores}`);
        console.log(`📈 Tasa de éxito: ${Math.round((importados / (importados + errores)) * 100)}%`);
        
        if (erroresDetalle.length > 0) {
            console.log(`\n⚠️ PRIMEROS 10 ERRORES:`);
            erroresDetalle.slice(0, 10).forEach(error => {
                console.log(`   - ${error}`);
            });
            if (erroresDetalle.length > 10) {
                console.log(`   ... y ${erroresDetalle.length - 10} más`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en importación:', error.message);
    } finally {
        await client.end();
    }
}

// Ejecutar importación
importarTodosDatos();
