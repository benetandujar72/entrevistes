const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function asignarTutoresCorrectos() {
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

    let actualizados = 0;
    let errores = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const alumno = result.rows[i];
      const tutorIndex = i % tutores.length;
      const tutorEmail = tutores[tutorIndex];
      
      try {
        // Crear personal_id único si no existe
        let personalId = alumno.personal_id;
        if (!personalId) {
          personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Insertar datos personales básicos
          await client.query(`
            INSERT INTO pf (personal_id, created_at, updated_at)
            VALUES ($1, NOW(), NOW())
          `, [personalId]);

          // Actualizar alumno con personal_id
          await client.query(
            'UPDATE alumnes SET personal_id = $1 WHERE alumne_id = $2',
            [personalId, alumno.alumne_id]
          );
        }

        // Asignar tutor académico
        await client.query(`
          INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs)
          VALUES ($1, $2, $3)
          ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
        `, [alumno.alumne_id, tutorEmail, alumno.any_curs]);

        // Asignar tutor personal
        const tutorNombre = tutorEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        await client.query(`
          UPDATE pf 
          SET 
            tutor_personal_nom = $1,
            tutor_personal_email = $2,
            updated_at = NOW()
          WHERE personal_id = $3
        `, [tutorNombre, tutorEmail, personalId]);

        actualizados++;
        console.log(`✅ ${alumno.nom} → ${tutorEmail}`);

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

asignarTutoresCorrectos();
