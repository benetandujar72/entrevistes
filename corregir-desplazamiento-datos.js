const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function corregirDesplazamientoDatos() {
  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Obtener todos los alumnos con sus datos personales
    const alumnosQuery = `
      SELECT 
        a.alumne_id,
        a.nom,
        a.personal_id,
        pf.personal_id as pf_personal_id,
        pf.tutor1_nom,
        pf.tutor1_email,
        pf.tutor2_nom,
        pf.tutor2_email
      FROM alumnes a
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      WHERE a.personal_id IS NOT NULL
      ORDER BY a.nom
    `;

    const alumnosResult = await client.query(alumnosQuery);
    console.log(`Encontrados ${alumnosResult.rows.length} alumnos con datos personales`);

    // Crear un mapa de datos personales únicos
    const datosUnicos = new Map();
    
    for (const alumno of alumnosResult.rows) {
      if (alumno.tutor1_nom && alumno.tutor1_email) {
        const key = `${alumno.tutor1_nom}|${alumno.tutor1_email}|${alumno.tutor2_nom}|${alumno.tutor2_email}`;
        if (!datosUnicos.has(key)) {
          datosUnicos.set(key, {
            tutor1_nom: alumno.tutor1_nom,
            tutor1_email: alumno.tutor1_email,
            tutor2_nom: alumno.tutor2_nom,
            tutor2_email: alumno.tutor2_email
          });
        }
      }
    }

    console.log(`Encontrados ${datosUnicos.size} conjuntos únicos de datos de tutores`);

    // Asignar datos únicos a cada alumno
    let actualizados = 0;
    let errores = 0;
    const datosArray = Array.from(datosUnicos.values());

    for (let i = 0; i < alumnosResult.rows.length; i++) {
      const alumno = alumnosResult.rows[i];
      const datosIndex = i % datosArray.length;
      const datos = datosArray[datosIndex];

      try {
        const updateQuery = `
          UPDATE pf 
          SET 
            tutor1_nom = $1,
            tutor1_email = $2,
            tutor2_nom = $3,
            tutor2_email = $4,
            updated_at = NOW()
          WHERE personal_id = $5
        `;

        const result = await client.query(updateQuery, [
          datos.tutor1_nom,
          datos.tutor1_email,
          datos.tutor2_nom,
          datos.tutor2_email,
          alumno.personal_id
        ]);

        if (result.rowCount > 0) {
          actualizados++;
          console.log(`✅ ${alumno.nom} → ${datos.tutor1_nom} (${datos.tutor1_email})`);
        } else {
          console.log(`⚠️  ${alumno.nom}: No se pudo actualizar`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error con ${alumno.nom}:`, error.message);
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

corregirDesplazamientoDatos();
