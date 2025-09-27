const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function asignarTutoresPersonales() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Obtener todas las asignaciones de tutores
    const tutoresQuery = `
      SELECT 
        ta.alumne_id,
        a.nom as alumne_nom,
        ta.tutor_email
      FROM tutories_alumne ta
      JOIN alumnes a ON ta.alumne_id = a.alumne_id
      WHERE ta.any_curs = '2025-2026'
    `;

    const tutoresResult = await client.query(tutoresQuery);
    console.log(`Encontrados ${tutoresResult.rows.length} tutores asignados`);

    let actualizados = 0;
    let errores = 0;

    for (const tutor of tutoresResult.rows) {
      try {
        // Actualizar la tabla pf con el tutor personal
        const updateQuery = `
          UPDATE pf 
          SET 
            tutor_personal_nom = $1,
            tutor_personal_email = $2,
            updated_at = NOW()
          WHERE personal_id = (
            SELECT personal_id FROM alumnes WHERE alumne_id = $3
          )
        `;

        // Extraer nombre del tutor del email (antes del @)
        const tutorNombre = tutor.tutor_email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const result = await client.query(updateQuery, [
          tutorNombre,
          tutor.tutor_email,
          tutor.alumne_id
        ]);

        if (result.rowCount > 0) {
          actualizados++;
          console.log(`✅ ${tutor.alumne_nom} → ${tutor.tutor_email}`);
        } else {
          console.log(`⚠️  ${tutor.alumne_nom}: No se encontró personal_id`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error con ${tutor.alumne_nom}:`, error.message);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Actualizados: ${actualizados}`);
    console.log(`❌ Errores: ${errores}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

asignarTutoresPersonales();
