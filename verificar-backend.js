// Script para verificar el estado del backend y las tablas
const { exec } = require('child_process');

async function verificarBackend() {
  console.log('🔍 Verificando estado del backend...');
  
  // Verificar si los contenedores están corriendo
  exec('docker-compose ps', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error verificando contenedores:', error);
      return;
    }
    console.log('📊 Estado de contenedores:');
    console.log(stdout);
  });
  
  // Verificar endpoint de salud
  exec('curl -s http://localhost:8081/health', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error verificando salud del backend:', error);
      return;
    }
    console.log('💚 Respuesta del backend:', stdout);
  });
  
  // Verificar tablas en la base de datos
  exec('docker exec -it entrevistes-db psql -U entrevistes -d entrevistes -c "\\d"', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error verificando tablas:', error);
      return;
    }
    console.log('🗄️ Tablas en la base de datos:');
    console.log(stdout);
  });
  
  // Verificar específicamente la tabla configuracion_horarios_tutor
  exec('docker exec -it entrevistes-db psql -U entrevistes -d entrevistes -c "\\d configuracion_horarios_tutor"', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Tabla configuracion_horarios_tutor no existe:', error);
      return;
    }
    console.log('✅ Tabla configuracion_horarios_tutor existe:');
    console.log(stdout);
  });
}

verificarBackend();
