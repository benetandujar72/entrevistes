// Script para importar datos personales desde CSV a la base de datos
const fs = require('fs');
const path = require('path');

console.log('📊 IMPORTACIÓN DE DATOS PERSONALES');
console.log('==================================\n');

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

// Analizar datos del CSV
const datosPersonales = [];
const problemas = [];

console.log('\n📋 ANÁLISIS DE DATOS:');
console.log('======================');

for (let i = 2; i < lines.length; i++) { // Empezar desde la línea 3 (índice 2)
    if (lines[i].trim()) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length >= 25) {
            try {
                const dato = {
                    // Datos básicos
                    alumne_nom: values[3], // Alumn@
                    alumne_email: values[8], // Email alumnat
                    sexe: values[1] === 'H' ? 'H' : values[1] === 'D' ? 'D' : 'X', // Sexe
                    data_naixement: values[12], // Data de naixement
                    municipi_naixement: values[13], // Municipi de naixement
                    nacionalitat: values[14], // Nacionalitat
                    adreca: values[15], // Adreça
                    municipi_residencia: values[16], // Municipi de residència
                    codi_postal: values[17], // CP
                    
                    // Documentación
                    doc_identitat: values[10], // Doc. Identitat
                    tis: values[11], // TIS
                    ralc: values[9], // RALC
                    
                    // Tutores
                    tutor1_nom: values[18], // Tutor 1
                    tutor1_tel: values[19], // Telèfon
                    tutor1_email: values[20], // email tutor 1
                    tutor2_nom: values[21], // Tutor 2
                    tutor2_tel: values[22], // Telèfon
                    tutor2_email: values[23], // email tutor 2
                    
                    // Información académica
                    grup: values[2], // Grup
                    tutor_personal: values[5], // tutor personal
                    tutor_email: values[6], // mail t.p.
                    
                    // Otros
                    link_fotografia: values[24] || null // link fotografia
                };
                
                // Validar datos esenciales
                if (dato.alumne_nom && dato.alumne_email && dato.sexe) {
                    datosPersonales.push(dato);
                } else {
                    problemas.push({
                        linea: i + 1,
                        problema: 'Datos esenciales faltantes',
                        alumno: dato.alumne_nom || 'N/A'
                    });
                }
            } catch (error) {
                problemas.push({
                    linea: i + 1,
                    problema: 'Error parseando línea',
                    alumno: 'N/A'
                });
            }
        } else {
            problemas.push({
                linea: i + 1,
                problema: 'Muy pocas columnas',
                alumno: 'N/A'
            });
        }
    }
}

console.log(`✅ Datos personales válidos: ${datosPersonales.length}`);
console.log(`⚠️ Problemas encontrados: ${problemas.length}`);

// Mostrar algunos ejemplos
console.log('\n📋 EJEMPLOS DE DATOS:');
console.log('=====================');
datosPersonales.slice(0, 3).forEach((dato, index) => {
    console.log(`\n${index + 1}. ${dato.alumne_nom}`);
    console.log(`   Email: ${dato.alumne_email}`);
    console.log(`   Sexe: ${dato.sexe}`);
    console.log(`   Data naixement: ${dato.data_naixement}`);
    console.log(`   Tutor 1: ${dato.tutor1_nom} (${dato.tutor1_email})`);
    if (dato.tutor2_nom) {
        console.log(`   Tutor 2: ${dato.tutor2_nom} (${dato.tutor2_email})`);
    }
});

// Función para importar datos personales
async function importarDadesPersonals() {
    try {
        console.log('\n🔄 Importando datos personales...');
        
        let importados = 0;
        let errores = 0;
        
        for (const dato of datosPersonales) {
            try {
                // Crear personal_id único
                const personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Insertar datos personales
                const response = await fetch('http://localhost:8081/dades-personals/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer benet.andujar@insbitacola.cat'
                    },
                    body: JSON.stringify({
                        personal_id: personalId,
                        alumne_nom: dato.alumne_nom,
                        alumne_email: dato.alumne_email,
                        sexe: dato.sexe,
                        data_naixement: dato.data_naixement,
                        municipi_naixement: dato.municipi_naixement,
                        nacionalitat: dato.nacionalitat,
                        adreca: dato.adreca,
                        municipi_residencia: dato.municipi_residencia,
                        codi_postal: dato.codi_postal,
                        doc_identitat: dato.doc_identitat,
                        tis: dato.tis,
                        ralc: dato.ralc,
                        link_fotografia: dato.link_fotografia,
                        tutor1_nom: dato.tutor1_nom,
                        tutor1_tel: dato.tutor1_tel,
                        tutor1_email: dato.tutor1_email,
                        tutor2_nom: dato.tutor2_nom,
                        tutor2_tel: dato.tutor2_tel,
                        tutor2_email: dato.tutor2_email
                    })
                });
                
                if (response.ok) {
                    importados++;
                    console.log(`✅ ${dato.alumne_nom} - Datos personales importados`);
                } else {
                    errores++;
                    const error = await response.text();
                    console.log(`❌ Error importando ${dato.alumne_nom}: ${error}`);
                }
            } catch (error) {
                errores++;
                console.log(`❌ Error importando ${dato.alumne_nom}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Resultado:`);
        console.log(`✅ Importados: ${importados}`);
        console.log(`❌ Errores: ${errores}`);
        
    } catch (error) {
        console.error('❌ Error en importación:', error.message);
        process.exit(1);
    }
}

// Ejecutar importación
importarDadesPersonals();
