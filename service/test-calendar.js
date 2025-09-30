const { googleCalendarService } = require('./dist/calendar/google-calendar.js');

async function testGoogleCalendar() {
  console.log('🧪 Probando configuración de Google Calendar...\n');

  try {
    // Test 1: Crear un evento de prueba
    console.log('1️⃣ Creando evento de prueba...');
    const testEvent = await googleCalendarService.createEvent({
      title: '🧪 Prueba de Configuración - ' + new Date().toLocaleString(),
      description: 'Este es un evento de prueba para verificar que la configuración de Google Calendar funciona correctamente.',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // Mañana + 30 min
      attendees: [
        { email: 'test@example.com', name: 'Usuario de Prueba' }
      ],
      location: 'Centro Educativo - Prueba'
    });

    console.log('✅ Evento creado exitosamente!');
    console.log('   ID del evento:', testEvent.googleEventId);
    console.log('   URL del evento:', testEvent.eventUrl);

    // Test 2: Verificar conflictos
    console.log('\n2️⃣ Verificando conflictos...');
    const hasConflicts = await googleCalendarService.checkConflicts(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
    );
    console.log('   Conflictos encontrados:', hasConflicts);

    // Test 3: Actualizar evento
    console.log('\n3️⃣ Actualizando evento...');
    await googleCalendarService.updateEvent(testEvent.googleEventId, {
      title: '🧪 Prueba Actualizada - ' + new Date().toLocaleString(),
      description: 'Evento actualizado correctamente!'
    });
    console.log('✅ Evento actualizado exitosamente!');

    // Test 4: Eliminar evento de prueba
    console.log('\n4️⃣ Eliminando evento de prueba...');
    await googleCalendarService.deleteEvent(testEvent.googleEventId);
    console.log('✅ Evento eliminado exitosamente!');

    console.log('\n🎉 ¡Todas las pruebas pasaron! Google Calendar está configurado correctamente.');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.log('\n🔧 Verifica que:');
    console.log('   - Las credenciales estén correctas en .env');
    console.log('   - La cuenta de servicio tenga permisos en el calendario');
    console.log('   - La API de Google Calendar esté habilitada');
  }
}

testGoogleCalendar();
