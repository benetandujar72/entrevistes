// Script per afegir alumnes manualment
const { Client } = require('pg');

console.log('📊 AFEGINT ALUMNES MANUALMENT');
console.log('==============================\n');

// Configuració de la base de dades
const dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
};

// Lista de alumnos esperados del usuario
const alumnesEsperats = [
  'Arribas Bonilla, Neizan',
  'Ballester Altabella, Lola',
  'Clarà Cara, Max',
  'Cumelles Galvez, Xavier',
  'Cunha Morote, Lucas',
  'Fluja Sánchez, Delia',
  'Giralt Salguero, Aina',
  'González Fonts, Jan',
  'Navarro Giménez, Vera',
  'Páez Dueñas, Irene',
  'Quirós Solorzano, Lua',
  'Rama Morales, Laura',
  'Real Frutos, Albert',
  'Rodríguez Lozano, Hugo',
  'Sanz Riosalido, Lucía',
  'Fuentes Moreno, Aaron'  // Aquest és l'alumne extra que apareix al CSV
];

async function afegirAlumnesManualment() {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('✅ Connectat a la base de dades');
        
        // Verificar alumnes existents
        const existentsResult = await client.query('SELECT nom FROM alumnes');
        const existents = new Set(existentsResult.rows.map(row => row.nom.toLowerCase()));
        
        console.log(`👥 Alumnes existents: ${existents.size}`);
        
        let afegits = 0;
        
        for (const nom of alumnesEsperats) {
            if (!existents.has(nom.toLowerCase())) {
                // Afegir alumne
                const alumneId = `alumne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                await client.query(
                    'INSERT INTO alumnes (alumne_id, nom) VALUES ($1, $2)',
                    [alumneId, nom]
                );
                
                // Assignar grup per defecte (1A per simplicitat)
                const grupResult = await client.query('SELECT grup_id FROM grups WHERE nom = $1', ['1A']);
                
                if (grupResult.rows.length > 0) {
                    const alumneCursId = `ac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await client.query(
                        'INSERT INTO alumnes_curs (alumne_curs_id, alumne_id, grup_id, any_curs) VALUES ($1, $2, $3, $4)',
                        [alumneCursId, alumneId, grupResult.rows[0].grup_id, '2025-2026']
                    );
                }
                
                afegits++;
                console.log(`✅ Afegit: ${nom}`);
            } else {
                console.log(`⏭️ Ja existeix: ${nom}`);
            }
        }
        
        // Verificar total final
        const totalResult = await client.query('SELECT COUNT(*) FROM alumnes');
        console.log(`\n📊 RESULTAT:`);
        console.log(`✅ Alumnes afegits: ${afegits}`);
        console.log(`📈 Total alumnes a la BD: ${totalResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

afegirAlumnesManualment();
