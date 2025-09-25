// Script para importar datos personales directamente a la base de datos
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('📊 IMPORTACIÓN DIRECTA DE DATOS PERSONALES');
console.log('==========================================\n');

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
async function importarDades() {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');
        
        let importados = 0;
        let errores = 0;
        
        for (let i = 2; i < lines.length; i++) { // Empezar desde la línea 3
            if (lines[i].trim()) {
                const values = parseCSVLine(lines[i]);
                
                if (values.length >= 25) {
                    try {
                        const dato = {
                            alumne_nom: values[3],
                            alumne_email: values[8],
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
                        
                        // Buscar alumno por email
                        const alumneResult = await client.query(
                            'SELECT alumne_id FROM alumnes WHERE email = $1',
                            [dato.alumne_email]
                        );
                        
                        if (alumneResult.rows.length === 0) {
                            console.log(`⚠️ Alumno no encontrado: ${dato.alumne_nom} (${dato.alumne_email})`);
                            errores++;
                            continue;
                        }
                        
                        const alumneId = alumneResult.rows[0].alumne_id;
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
                            [personalId, alumneId]
                        );
                        
                        importados++;
                        console.log(`✅ ${dato.alumne_nom} - Datos personales importados`);
                        
                    } catch (error) {
                        errores++;
                        console.log(`❌ Error importando ${values[3]}: ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`\n📊 Resultado:`);
        console.log(`✅ Importados: ${importados}`);
        console.log(`❌ Errores: ${errores}`);
        
    } catch (error) {
        console.error('❌ Error en importación:', error.message);
    } finally {
        await client.end();
    }
}

// Ejecutar importación
importarDades();
