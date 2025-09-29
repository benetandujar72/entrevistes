// Script per afegir alumnes faltants a la base de dades
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('📊 AFEGINT ALUMNES FALTANTS');
console.log('============================\n');

// Configuració de la base de dades
const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
};

// Llegir el CSV original
const csvPath = path.join(__dirname, 'Dades alumnat curs 25-26 - Full-Benet (1).csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log(`📁 CSV carregat: ${csvPath}`);
console.log(`📊 Total de línies: ${lines.length}`);

// Funció per parsejar CSV correctament
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

async function afegirAlumnesFaltants() {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('✅ Connectat a la base de dades');
        
        // Obtenir alumnes existents
        const alumnesExistentsResult = await client.query('SELECT nom FROM alumnes');
        const alumnesExistents = new Set(alumnesExistentsResult.rows.map(row => row.nom.toLowerCase().trim()));
        
        console.log(`👥 Alumnes existents: ${alumnesExistents.size}`);
        
        let alumnesAfegits = 0;
        let alumnesSaltats = 0;
        
        // Processar cada línia del CSV
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            
            if (values.length < 4 || !values[3] || values[3] === 'Alumn@') {
                continue;
            }
            
            const nomAlumne = values[3].trim();
            const nomNormalitzat = nomAlumne.toLowerCase().trim();
            
            // Si l'alumne ja existeix, saltar-lo
            if (alumnesExistents.has(nomNormalitzat)) {
                alumnesSaltats++;
                continue;
            }
            
            // Afegir alumne nou
            try {
                const alumneId = `alumne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Insertar alumne
                await client.query(
                    'INSERT INTO alumnes (alumne_id, nom) VALUES ($1, $2)',
                    [alumneId, nomAlumne]
                );
                
                // Obtenir grup del CSV
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
                
                alumnesAfegits++;
                console.log(`✅ Afegit: ${nomAlumne} (${grupCSV || 'Sense grup'})`);
                
            } catch (error) {
                console.log(`❌ Error afegint ${nomAlumne}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 RESULTAT FINAL:`);
        console.log(`✅ Alumnes afegits: ${alumnesAfegits}`);
        console.log(`⏭️ Alumnes saltats (ja existien): ${alumnesSaltats}`);
        
        // Verificar total final
        const totalResult = await client.query('SELECT COUNT(*) FROM alumnes');
        console.log(`📈 Total alumnes a la BD: ${totalResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

// Executar
afegirAlumnesFaltants();