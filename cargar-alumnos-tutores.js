const { Client } = require('pg');

// Configuración de la base de datos
const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'entrevistes',
  user: 'entrevistes',
  password: 'entrevistes'
});

async function cargarAlumnosTutores() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    
    console.log('📊 Verificando datos existentes...');
    
    // Verificar tutores existentes
    const tutoresResult = await client.query(`
      SELECT email, nom, cognoms, role 
      FROM usuaris 
      WHERE role = 'docent'
      ORDER BY cognoms, nom
    `);
    
    console.log(`👨‍🏫 Tutores encontrados: ${tutoresResult.rows.length}`);
    tutoresResult.rows.forEach(tutor => {
      console.log(`  - ${tutor.nom} ${tutor.cognoms} (${tutor.email})`);
    });
    
    // Verificar alumnos existentes
    const alumnosResult = await client.query(`
      SELECT alumne_id, nom, cognoms, curs, grup 
      FROM alumnes 
      ORDER BY cognoms, nom
    `);
    
    console.log(`👨‍🎓 Alumnos encontrados: ${alumnosResult.rows.length}`);
    alumnosResult.rows.forEach(alumno => {
      console.log(`  - ${alumno.nom} ${alumno.cognoms} (${alumno.curs} - ${alumno.grup})`);
    });
    
    // Verificar asignaciones existentes
    const asignacionesResult = await client.query(`
      SELECT 
        ta.tutor_email,
        u.nom as tutor_nom,
        u.cognoms as tutor_cognoms,
        COUNT(ta.alumne_id) as total_alumnos
      FROM tutories_alumne ta
      JOIN usuaris u ON ta.tutor_email = u.email
      WHERE ta.any_curs = '2025-2026'
      GROUP BY ta.tutor_email, u.nom, u.cognoms
      ORDER BY u.cognoms, u.nom
    `);
    
    console.log(`\n📋 Asignaciones actuales:`);
    asignacionesResult.rows.forEach(asignacion => {
      console.log(`  - ${asignacion.tutor_nom} ${asignacion.tutor_cognoms}: ${asignacion.total_alumnos} alumnos`);
    });
    
    // Mostrar alumnos por tutor
    console.log(`\n👥 Alumnos por tutor:`);
    for (const tutor of tutoresResult.rows) {
      const alumnosTutor = await client.query(`
        SELECT 
          a.alumne_id,
          a.nom,
          a.cognoms,
          a.curs,
          a.grup
        FROM alumnes a
        JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id
        WHERE ta.tutor_email = $1 AND ta.any_curs = '2025-2026'
        ORDER BY a.cognoms, a.nom
      `, [tutor.email]);
      
      console.log(`\n  📚 ${tutor.nom} ${tutor.cognoms} (${tutor.email}):`);
      if (alumnosTutor.rows.length === 0) {
        console.log(`    ❌ No tiene alumnos asignados`);
      } else {
        alumnosTutor.rows.forEach(alumno => {
          console.log(`    - ${alumno.nom} ${alumno.cognoms} (${alumno.curs} - ${alumno.grup})`);
        });
      }
    }
    
    // Estadísticas
    const statsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT ta.tutor_email) as total_tutores_con_alumnos,
        COUNT(ta.alumne_id) as total_alumnos_asignados,
        AVG(COUNT(ta.alumne_id)) OVER() as promedio_alumnos_por_tutor
      FROM tutories_alumne ta
      WHERE ta.any_curs = '2025-2026'
      GROUP BY ta.tutor_email
    `);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`\n📊 Estadísticas:`);
      console.log(`  - Tutores con alumnos: ${stats.total_tutores_con_alumnos}`);
      console.log(`  - Total alumnos asignados: ${stats.total_alumnos_asignados}`);
      console.log(`  - Promedio alumnos por tutor: ${Math.round(stats.promedio_alumnos_por_tutor * 100) / 100}`);
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cargarAlumnosTutores();
}

module.exports = { cargarAlumnosTutores };
