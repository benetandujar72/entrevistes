<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    crearConfiguracionHorarios, 
    obtenirConfiguracionHorarios, 
    generarEventosCalendario,
    obtenirEventosCalendario,
    replicarConfiguracionDia,
    obtenirTutores,
    type ConfiguracionHorariosTutor,
    type ConfiguracionHorario,
    type EventoCalendario,
    type Tutor
  } from '$lib/index.js';
  import { toastSuccess, toastError } from '$lib/toast.js';
  import Icon from '$lib/components/SimpleIcon.svelte';
  import TextField from '$lib/components/TextField.svelte';
  import Button from '$lib/components/Button.svelte';

  // Estado de la aplicación
  let tutorSeleccionat = '';
  let tutores: Tutor[] = [];
  let configuracionActual: ConfiguracionHorariosTutor | null = null;
  let configuraciones: ConfiguracionHorariosTutor[] = [];
  let eventos: EventoCalendario[] = [];
  let loading = false;
  let mostrarFormulario = false;
  let mostrarEventos = false;

  // Datos del formulario
  let nombreConfiguracion = '';
  let fechaInicio = '';
  let fechaFin = '';
  let duracionCita = 30;
  let diasSemana: ConfiguracionHorario[] = [
    { dia: 'lunes', inicio: '09:00', fin: '17:00', activo: false, duracion_cita: 30, franjas: [] },
    { dia: 'martes', inicio: '09:00', fin: '17:00', activo: false, duracion_cita: 30, franjas: [] },
    { dia: 'miercoles', inicio: '09:00', fin: '17:00', activo: false, duracion_cita: 30, franjas: [] },
    { dia: 'jueves', inicio: '09:00', fin: '17:00', activo: false, duracion_cita: 30, franjas: [] },
    { dia: 'viernes', inicio: '09:00', fin: '17:00', activo: false, duracion_cita: 30, franjas: [] }
  ];

  // Opciones de duración
  const opcionesDuracion = [
    { valor: 15, etiqueta: '15 minuts' },
    { valor: 30, etiqueta: '30 minuts' },
    { valor: 60, etiqueta: '1 hora' }
  ];

  // Nombres de días en catalán (solo laborables)
  const nombresDias: Record<string, string> = {
    'lunes': 'Dilluns',
    'martes': 'Dimarts', 
    'miercoles': 'Dimecres',
    'jueves': 'Dijous',
    'viernes': 'Divendres'
  };

  onMount(async () => {
    await carregarTutores();
    // Obtener tutor actual del localStorage o de la sesión
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
      tutorSeleccionat = user.email;
    }
    await carregarConfiguracions();
  });

  async function carregarTutores() {
    try {
      loading = true;
      tutores = await obtenirTutores();
    } catch (err: any) {
      toastError('Error carregant tutors: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function carregarConfiguracions() {
    if (!tutorSeleccionat) return;
    
    try {
      loading = true;
      configuraciones = await obtenirConfiguracionHorarios(tutorSeleccionat);
    } catch (err: any) {
      toastError('Error carregant configuracions: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function carregarEventos() {
    if (!tutorSeleccionat) return;
    
    try {
      loading = true;
      eventos = await obtenirEventosCalendario(tutorSeleccionat, fechaInicio, fechaFin);
      mostrarEventos = true;
    } catch (err: any) {
      toastError('Error carregant events: ' + err.message);
    } finally {
      loading = false;
    }
  }

  function activarTodosDias() {
    diasSemana = diasSemana.map(dia => ({ ...dia, activo: true }));
  }

  function desactivarTodosDias() {
    diasSemana = diasSemana.map(dia => ({ ...dia, activo: false }));
  }

  function replicarDia(diaOrigen: string) {
    const configuracionOrigen = diasSemana.find(d => d.dia === diaOrigen);
    if (!configuracionOrigen) return;

    const diasDestino = diasSemana
      .filter(d => d.dia !== diaOrigen && d.activo)
      .map(d => d.dia);

    if (diasDestino.length === 0) {
      toastError('Selecciona almenys un dia destí per replicar');
      return;
    }

    diasSemana = diasSemana.map(dia => {
      if (diasDestino.includes(dia.dia)) {
        return {
          ...configuracionOrigen,
          dia: dia.dia
        };
      }
      return dia;
    });

    toastSuccess(`Configuració de ${nombresDias[diaOrigen]} replicada a ${diasDestino.length} dies`);
  }

  function generarFranjasHorarias(inicio: string, fin: string, duracion: number): string[] {
    const franjas: string[] = [];
    const [horaIni, minIni] = inicio.split(':').map(Number);
    const [horaFin, minFin] = fin.split(':').map(Number);
    
    const inicioMinutos = horaIni * 60 + minIni;
    const finMinutos = horaFin * 60 + minFin;
    
    for (let minutos = inicioMinutos; minutos < finMinutos; minutos += duracion) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      const franja = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      franjas.push(franja);
    }
    
    return franjas;
  }

  function actualizarFranjasDia(dia: string) {
    const diaIndex = diasSemana.findIndex(d => d.dia === dia);
    if (diaIndex === -1) return;
    
    const diaConfig = diasSemana[diaIndex];
    if (diaConfig.activo) {
      const franjasGeneradas = generarFranjasHorarias(diaConfig.inicio, diaConfig.fin, duracionCita);
      diaConfig.franjas = franjasGeneradas.map(franja => ({
        inicio: franja,
        fin: franja,
        activo: true
      }));
    }
    
    diasSemana = [...diasSemana];
  }

  function agregarFranja(dia: string) {
    const diaIndex = diasSemana.findIndex(d => d.dia === dia);
    if (diaIndex === -1) return;
    
    const diaConfig = diasSemana[diaIndex];
    const nuevaFranja = {
      inicio: '09:00',
      fin: '10:00',
      activo: true
    };
    
    if (!diaConfig.franjas) diaConfig.franjas = [];
    diaConfig.franjas.push(nuevaFranja);
    
    diasSemana = [...diasSemana];
  }

  function eliminarFranja(dia: string, index: number) {
    const diaIndex = diasSemana.findIndex(d => d.dia === dia);
    if (diaIndex === -1) return;
    
    const diaConfig = diasSemana[diaIndex];
    if (diaConfig.franjas && diaConfig.franjas.length > index) {
      diaConfig.franjas.splice(index, 1);
      diasSemana = [...diasSemana];
    }
  }

  async function guardarConfiguracion() {
    if (!tutorSeleccionat || !nombreConfiguracion || !fechaInicio || !fechaFin) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    const diasActivos = diasSemana.filter(d => d.activo);
    if (diasActivos.length === 0) {
      toastError('Selecciona almenys un dia de la setmana');
      return;
    }

    try {
      loading = true;
      const resultat = await crearConfiguracionHorarios({
        tutor_email: tutorSeleccionat,
        nombre_configuracion: nombreConfiguracion,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        duracion_cita: duracionCita,
        dias_semana: diasSemana
      } as any);

      toastSuccess(`Configuració "${nombreConfiguracion}" creada correctament!`);
      
      // Resetear formulario
      nombreConfiguracion = '';
      fechaInicio = '';
      fechaFin = '';
      duracionCita = 30;
      diasSemana = diasSemana.map(dia => ({ ...dia, activo: false }));
      mostrarFormulario = false;
      
      // Recargar configuraciones
      await carregarConfiguracions();
      
    } catch (err: any) {
      toastError('Error creant configuració: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function generarEventos(configuracionId: number) {
    if (!tutorSeleccionat) return;

    try {
      loading = true;
      const resultat = await generarEventosCalendario(tutorSeleccionat, configuracionId);
      
      toastSuccess(`Events generats correctament! ${resultat.total_eventos} events creats.`);
      
      // Recargar eventos si están mostrándose
      if (mostrarEventos) {
        await carregarEventos();
      }
      
    } catch (err: any) {
      toastError('Error generant events: ' + err.message);
    } finally {
      loading = false;
    }
  }

  function seleccionarConfiguracion(config: ConfiguracionHorariosTutor) {
    configuracionActual = config;
    fechaInicio = config.fecha_inicio;
    fechaFin = config.fecha_fin;
  }
</script>

<div class="container mx-auto p-6 max-w-6xl">
  <div class="mb-8">
    <div class="flex items-center gap-4 mb-4">
      <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
        <Icon name="settings" size={24} />
      </div>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-1">Configuració de Horaris Dinàmics</h1>
        <p class="text-gray-600">Configura horaris flexibles per a cada tutor amb períodes personalitzables</p>
      </div>
    </div>
  </div>

  <!-- Selector de Tutor -->
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-6 border border-blue-100">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
        <Icon name="user" size={20} />
      </div>
      <h2 class="text-xl font-semibold text-gray-800">Selecció de Tutor</h2>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="tutor-select" class="block text-sm font-medium text-gray-700 mb-2">Tutor</label>
        <select 
          id="tutor-select"
          bind:value={tutorSeleccionat}
          onchange={carregarConfiguracions}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Selecciona un tutor</option>
          {#each tutores as tutor}
            <option value={tutor.tutor_email}>
              {tutor.tutor_email} ({tutor.total_alumnes} alumnes)
            </option>
          {/each}
        </select>
      </div>
      
      {#if tutorSeleccionat}
        <div class="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <span class="text-green-600">✅</span>
          <span class="text-sm text-green-700">Tutor seleccionat correctament</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Botones de Acción -->
  <div class="flex flex-wrap gap-4 mb-6">
    <Button variant="filled" leadingIcon="plus" on:click={() => mostrarFormulario = !mostrarFormulario}>
      {mostrarFormulario ? 'Cancel·lar' : 'Nova Configuració'}
    </Button>
    
    <Button variant="outlined" on:click={carregarConfiguracions} disabled={loading}>
      {loading ? 'Carregant…' : 'Recarregar'}
    </Button>
    
    <Button variant="tonal" leadingIcon="calendar" on:click={carregarEventos}>Veure Events</Button>
  </div>

  <!-- Formulario de Nueva Configuración -->
  {#if mostrarFormulario}
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Nova Configuració d'Horaris</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <TextField label="Nom de la Configuració" bind:value={nombreConfiguracion} placeholder="Ex: Horaris Setmana 1" />
        </div>
        
        <div>
          <label for="duracion-cita" class="block text-sm font-medium text-gray-700 mb-2">Durada de les Cites</label>
          <select 
            id="duracion-cita"
            bind:value={duracionCita}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {#each opcionesDuracion as opcion}
              <option value={opcion.valor}>{opcion.etiqueta}</option>
            {/each}
          </select>
        </div>
        
        <div>
          <TextField label="Data d'Inici" type="date" bind:value={fechaInicio} />
        </div>
        
        <div>
          <TextField label="Data de Fi" type="date" bind:value={fechaFin} />
        </div>
      </div>

      <!-- Configuración de Días -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Icon name="calendar" size={18} />
            </div>
            <h3 class="text-lg font-medium">Configuració per Dies Laborables</h3>
          </div>
          <div class="flex gap-2">
            <Button variant="tonal" leadingIcon="check" on:click={activarTodosDias}>Activar Tots</Button>
            <Button variant="outlined" leadingIcon="alert-circle" on:click={desactivarTodosDias}>Desactivar Tots</Button>
          </div>
        </div>

        <div class="space-y-4">
          {#each diasSemana as dia, index}
            <div class="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-white">
              <div class="flex items-center gap-4 mb-3">
                <label class="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    bind:checked={dia.activo}
                    onchange={() => actualizarFranjasDia(dia.dia)}
                    class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span class="font-semibold text-lg w-32">{nombresDias[dia.dia]}</span>
                </label>
                
                {#if dia.activo}
                  <Button variant="tonal" size="sm" leadingIcon="plus" on:click={() => agregarFranja(dia.dia)}>Afegir Franja</Button>
                {/if}
              </div>
              
              {#if dia.activo}
                <div class="space-y-3">
                  <!-- Franja principal -->
                  <div class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="flex items-center gap-2 text-blue-600">
                      <Icon name="calendar" size={16} />
                      <span class="text-sm font-medium text-blue-800">Franja Principal:</span>
                    </div>
                    <input 
                      type="time" 
                      bind:value={dia.inicio}
                      onchange={() => actualizarFranjasDia(dia.dia)}
                      class="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span class="text-blue-600">a</span>
                    <input 
                      type="time" 
                      bind:value={dia.fin}
                      onchange={() => actualizarFranjasDia(dia.dia)}
                      class="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button variant="filled" size="sm" leadingIcon="notes" on:click={() => replicarDia(dia.dia)} title="Replicar aquesta configuració als altres dies actius">Replicar</Button>
                  </div>

                  <!-- Franjas adicionales -->
                  {#if dia.franjas && dia.franjas.length > 0}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Icon name="calendar" size={14} />
                        Franjes Horàries Generades:
                      </h4>
                      <div class="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {#each dia.franjas as franja}
                          <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs text-center">
                            {franja}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Franjas personalizadas -->
                  {#if dia.franjas && dia.franjas.length > 0}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Icon name="settings" size={14} />
                        Franjes Personalitzades:
                      </h4>
                      {#each dia.franjas as franja, franjaIndex}
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <input 
                            type="time" 
                            bind:value={franja.inicio}
                            class="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span class="text-gray-500">a</span>
                          <input 
                            type="time" 
                            bind:value={franja.fin}
                            class="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <Button variant="outlined" size="sm" leadingIcon="alert-circle" on:click={() => eliminarFranja(dia.dia, franjaIndex)} />
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Botones del Formulario -->
      <div class="flex gap-4 pt-4 border-t border-gray-200">
        <Button variant="filled" on:click={guardarConfiguracion} loading={loading} leadingIcon="check">{loading ? 'Guardant…' : 'Guardar Configuració'}</Button>
        <Button variant="outlined" leadingIcon="alert-circle" on:click={() => mostrarFormulario = false}>Cancel·lar</Button>
      </div>
    </div>
  {/if}

  <!-- Lista de Configuraciones -->
  <div class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-xl font-semibold mb-4">Configuracions Existents</h2>
    
    {#if loading}
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Carregant configuracions...</p>
      </div>
    {:else if configuraciones.length === 0}
      <div class="text-center py-8 text-gray-500">
        <p>No hi ha configuracions creades encara.</p>
        <p class="text-sm">Crea la teva primera configuració per començar.</p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each configuraciones as config}
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-medium text-lg">{config.nombre_configuracion}</h3>
                <p class="text-sm text-gray-600">
                  {config.fecha_inicio} - {config.fecha_fin} | 
                  Durada: {config.duracion_cita} min | 
                  Dies actius: {config.dias_semana.filter((d: any) => d.activo).length}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Creat: {new Date(config.created_at).toLocaleDateString('ca-ES')}
                </p>
              </div>
              
              <div class="flex gap-2">
                <button 
                  onclick={() => seleccionarConfiguracion(config)}
                  class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Seleccionar
                </button>
                <button 
                  onclick={() => generarEventos(config.id)}
                  disabled={loading}
                  class="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                >
                  Generar Events
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Vista de Eventos Generados -->
  {#if mostrarEventos}
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Events Generats</h2>
        <button 
          onclick={() => mostrarEventos = false}
          class="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          Tancar
        </button>
      </div>
      
      {#if loading}
        <div class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Carregant events...</p>
        </div>
      {:else if eventos.length === 0}
        <div class="text-center py-8 text-gray-500">
          <p>No hi ha events generats encara.</p>
          <p class="text-sm">Genera events des d'una configuració per veure'ls aquí.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each eventos as evento}
            <div class="border border-gray-200 rounded-lg p-3">
              <h4 class="font-medium">{evento.titulo}</h4>
              <p class="text-sm text-gray-600">
                {new Date(evento.fecha_inicio).toLocaleDateString('ca-ES')} 
                {new Date(evento.fecha_inicio).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <span class="inline-block px-2 py-1 text-xs rounded-full mt-2 {
                evento.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                evento.estado === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                evento.estado === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }">
                {evento.estado}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    font-family: 'Inter', sans-serif;
  }
</style>
