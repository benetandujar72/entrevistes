const http = require('http');

function checkServer() {
  const options = {
    hostname: 'localhost',
    port: 8081,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Servidor funcionando: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Respuesta:', data);
    });
  });

  req.on('error', (err) => {
    console.log(`❌ Error conectando al servidor: ${err.message}`);
    console.log('El servidor no está ejecutándose en el puerto 8081');
  });

  req.end();
}

console.log('🔍 Verificando estado del servidor...');
checkServer();
