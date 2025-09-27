const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function crearCsvDatos() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Obtener todos los alumnos con sus grupos
    const query = `
      SELECT 
        a.alumne_id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        ac.any_curs
      FROM alumnes a
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE ac.any_curs = '2025-2026'
      ORDER BY a.nom
    `;

    const result = await client.query(query);
    console.log(`Encontrados ${result.rows.length} alumnos`);

    // Crear CSV con datos básicos
    let csvContent = 'anyCurs,alumne_nom,alumne_email,tutor_email,grup\n';
    
    // Lista de tutores disponibles
    const tutores = [
      'xavier.reyes@insbitacola.cat',
      'blanca.pi@insbitacola.cat',
      'laia.giner@insbitacola.cat',
      'albert.parrilla@insbitacola.cat',
      'rony.castillo@insbitacola.cat',
      'benet.andujar@insbitacola.cat',
      'dani.palau@insbitacola.cat'
    ];

    for (let i = 0; i < result.rows.length; i++) {
      const alumno = result.rows[i];
      const tutorIndex = i % tutores.length;
      const tutorEmail = tutores[tutorIndex];
      
      csvContent += `${alumno.any_curs},${alumno.nom},${alumno.email || ''},${tutorEmail},${alumno.grup_nom}\n`;
    }

    // Guardar archivo CSV
    fs.writeFileSync('datos-limpios.csv', csvContent);
    console.log('✅ Archivo datos-limpios.csv creado');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

crearCsvDatos();
