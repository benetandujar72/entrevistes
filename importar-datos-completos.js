const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function importarDatosCompletos() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Leer el archivo CSV
    const csvContent = fs.readFileSync('datos-limpios.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`Procesando ${lines.length - 1} líneas del CSV`);

    let importados = 0;
    let errores = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');

      if (values.length < 5) {
        console.log(`⚠️  Línea ${i + 1}: Formato incorrecto`);
        continue;
      }

      const anyCurs = values[0]?.trim();
      const alumneNom = values[1]?.trim();
      const alumneEmail = values[2]?.trim();
      const tutorEmail = values[3]?.trim();
      const grup = values[4]?.trim();

      if (!alumneNom || !tutorEmail) {
        console.log(`⚠️  Línea ${i + 1}: Datos incompletos`);
        continue;
      }

      try {
        // Buscar alumno por nombre
        const alumneResult = await client.query(
          'SELECT alumne_id FROM alumnes WHERE nom = $1',
          [alumneNom]
        );

        if (alumneResult.rows.length === 0) {
          console.log(`⚠️  ${alumneNom}: No encontrado en la base de datos`);
          continue;
        }

        const alumneId = alumneResult.rows[0].alumne_id;

        // Crear personal_id único
        const personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Insertar datos personales básicos
        await client.query(`
          INSERT INTO pf (personal_id, created_at, updated_at)
          VALUES ($1, NOW(), NOW())
        `, [personalId]);

        // Actualizar alumno con personal_id
        await client.query(
          'UPDATE alumnes SET personal_id = $1, email = $2 WHERE alumne_id = $3',
          [personalId, alumneEmail, alumneId]
        );

        // Asignar tutor académico
        await client.query(`
          INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs)
          VALUES ($1, $2, $3)
          ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
        `, [alumneId, tutorEmail, anyCurs]);

        // Asignar tutor personal (usando el mismo email del tutor académico)
        const tutorNombre = tutorEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        await client.query(`
          UPDATE pf 
          SET 
            tutor_personal_nom = $1,
            tutor_personal_email = $2,
            updated_at = NOW()
          WHERE personal_id = $3
        `, [tutorNombre, tutorEmail, personalId]);

        importados++;
        console.log(`✅ ${alumneNom} → ${tutorEmail}`);

      } catch (error) {
        errores++;
        console.error(`❌ Error con ${alumneNom}:`, error.message);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Importados: ${importados}`);
    console.log(`❌ Errores: ${errores}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

importarDatosCompletos();
