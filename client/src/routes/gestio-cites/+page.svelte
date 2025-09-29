<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    obtenirEventosCalendario,
    confirmarCita,
    getMe,
    type Me,
    type EventoCalendario
  } from '$lib';
  import { toastError, toastSuccess } from '$lib/toast';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let me: Me | null = null;
  let tutorSeleccionat: string = '';
  let eventos: EventoCalendario[] = [];
  let loading = false;
  let error: string | null = null;
  let filtroEstado = 'todos';
  let filtroFecha = '';

  onMount(async () => {
    me = await getMe();
    if (me?.role === 'docent') {
      tutorSeleccionat = me.email;
    }
    await carregarEventos();
  });

  async function carregarEventos() {
    if (!tutorSeleccionat) return;
    
    try {
      loading = true;
      error = null;
      
      const fechaInicio = filtroFecha ? new Date(filtroFecha).toISOString() : undefined;
      const fechaFin = filtroFecha ? new Date(new Date(filtroFecha).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined;
      
      eventos = await obtenirEventosCalendario(tutorSeleccionat, fechaInicio, fechaFin);
      
      // Aplicar filtro de estado
      if (filtroEstado !== 'todos') {
        eventos = eventos.filter(e => e.estado === filtroEstado);
      }
      
    } catch (err: any) {
      error = err.message;
      toastError('Error carregant events: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function confirmarEvento(eventoId: number) {
    try {
      await confirmarCita(eventoId.toString());
      toastSuccess('Event confirmat correctament');
      await carregarEventos();
    } catch (err: any) {
      toastError('Error confirmant event: ' + err.message);
    }
  }

  function getEstadoColor(estado: string): string {
    const colores = {
      'disponible': '#3b82f6',
      'reservado': '#f59e0b',
      'confirmado': '#10b981',
      'cancelado': '#ef4444'
    };
    return colores[estado as keyof typeof colores] || '#6b7280';
  }

  function getEstadoTexto(estado: string): string {
    const textos = {
      'disponible': 'Disponible',
      'reservado': 'Reservat',
      'confirmado': 'Confirmat',
      'cancelado': 'Cancel·lat'
    };
    return textos[estado as keyof typeof textos] || estado;
  }

  function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatearDuracion(fechaInicio: string, fechaFin: string): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60));
  }

  // Recargar cuando cambien los filtros
  $: if (tutorSeleccionat) {
    carregarEventos();
  }
</script>

<div class="container">
  <h1>Gestió de Cites</h1>
  
  {#if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {/if}

  <!-- Filtros -->
  <div class="filtros">
    <div class="filtro-group">
      <label for="tutor">Tutor:</label>
      <select id="tutor" bind:value={tutorSeleccionat} disabled={me?.role === 'docent'}>
        {#if me?.role === 'admin'}
          <option value="albert.parrilla@insbitacola.cat">Albert Parrilla</option>
          <option value="blanca.pi@insbitacola.cat">Blanca Pi</option>
          <option value="dani.palau@insbitacola.cat">Dani Palau</option>
          <option value="laia.giner@insbitacola.cat">Laia Giner</option>
          <option value="rony.castillo@insbitacola.cat">Rony Castillo</option>
          <option value="xavi.reyes@insbitacola.cat">Xavi Reyes</option>
        {:else}
          <option value={me?.email}>{me?.email}</option>
        {/if}
      </select>
    </div>

    <div class="filtro-group">
      <label for="estado">Estat:</label>
      <select id="estado" bind:value={filtroEstado}>
        <option value="todos">Tots</option>
        <option value="disponible">Disponible</option>
        <option value="reservado">Reservat</option>
        <option value="confirmado">Confirmat</option>
        <option value="cancelado">Cancel·lat</option>
      </select>
    </div>

    <div class="filtro-group">
      <label for="fecha">Data:</label>
      <input id="fecha" type="date" bind:value={filtroFecha} />
    </div>

    <button class="btn btn-primary" onclick={carregarEventos}>
      <Icon name="refresh" size={16} />
      Actualitzar
    </button>
  </div>

  <!-- Lista de eventos -->
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregant events...</p>
    </div>
  {:else if eventos.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📅</div>
      <h3>No hi ha events</h3>
      <p>No s'han trobat events amb els filtres seleccionats.</p>
    </div>
  {:else}
    <div class="eventos-grid">
      {#each eventos as evento}
        <div class="evento-card" style="border-left-color: {getEstadoColor(evento.estado)};">
          <div class="evento-header">
            <h3>{evento.titulo}</h3>
            <span class="estado" style="background: {getEstadoColor(evento.estado)};">
              {getEstadoTexto(evento.estado)}
            </span>
          </div>
          
          <div class="evento-info">
            <div class="info-item">
              <Icon name="clock" size={16} />
              <span>{formatearFecha(evento.fecha_inicio)}</span>
            </div>
            
            <div class="info-item">
              <Icon name="timer" size={16} />
              <span>{formatearDuracion(evento.fecha_inicio, evento.fecha_fin)} minuts</span>
            </div>
            
            {#if evento.descripcion}
              <div class="info-item">
                <Icon name="file-text" size={16} />
                <span>{evento.descripcion}</span>
              </div>
            {/if}
            
            {#if evento.datos_familia}
              <div class="familia-info">
                <h4>Dades de la família:</h4>
                <p><strong>Nom:</strong> {evento.datos_familia.nom_familia}</p>
                <p><strong>Email:</strong> {evento.datos_familia.email_familia}</p>
                <p><strong>Telèfon:</strong> {evento.datos_familia.telefon_familia}</p>
                {#if evento.datos_familia.notes}
                  <p><strong>Notes:</strong> {evento.datos_familia.notes}</p>
                {/if}
              </div>
            {/if}
          </div>
          
          <div class="evento-actions">
            {#if evento.estado === 'reservado'}
              <button 
                class="btn btn-success btn-sm" 
                onclick={() => confirmarEvento(evento.id)}
              >
                <Icon name="check" size={16} />
                Confirmar
              </button>
            {/if}
            
            {#if evento.google_event_id}
              <a 
                href="https://calendar.google.com" 
                target="_blank" 
                class="btn btn-secondary btn-sm"
              >
                <Icon name="external-link" size={16} />
                Veure a Google Calendar
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: #f8fafc;
    min-height: 100vh;
  }

  h1 {
    margin: 0 0 30px 0;
    color: #1e293b;
    font-size: 2rem;
    font-weight: 700;
  }

  .error {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    text-align: center;
  }

  .filtros {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .filtro-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filtro-group label {
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  .filtro-group select,
  .filtro-group input {
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
  }

  .filtro-group select:focus,
  .filtro-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 60px;
    color: #64748b;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    margin: 0 0 10px 0;
    color: #374151;
  }

  .eventos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
  }

  .evento-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-left: 4px solid #6b7280;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .evento-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .evento-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .evento-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.2rem;
  }

  .estado {
    padding: 4px 12px;
    border-radius: 20px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .evento-info {
    margin-bottom: 20px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    color: #64748b;
    font-size: 14px;
  }

  .familia-info {
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
    margin-top: 15px;
  }

  .familia-info h4 {
    margin: 0 0 10px 0;
    color: #374151;
    font-size: 14px;
  }

  .familia-info p {
    margin: 0 0 5px 0;
    font-size: 13px;
    color: #64748b;
  }

  .evento-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-success:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
    transform: translateY(-1px);
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 11px;
  }

  @media (max-width: 768px) {
    .container {
      padding: 15px;
    }

    .filtros {
      grid-template-columns: 1fr;
    }

    .eventos-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
