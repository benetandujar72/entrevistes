<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    obtenirHorariosTutor,
    reservarHorario,
    configurarHorarios as configurarHorariosAPI,
    obtenirEventosCalendario,
    generarEventosCalendario,
    obtenirAlumnesTutor,
    generarEnlaceCalendarioPublico,
    getMe,
    type Me,
    type ProgramadorCitas,
    type EventoCalendario,
    type ConfiguracionHorariosTutor
  } from '$lib';
  import { toastError, toastSuccess } from '$lib/toast';
  import Button from '$lib/components/Button.svelte';
  import TextField from '$lib/components/TextField.svelte';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let me: Me | null = null;
  let tutorSeleccionat: string = '';
  let fechaSeleccionada: string = '';
  let horarios: ProgramadorCitas | null = null;
  let loading = false;
  let error: string | null = null;

  // Configuración de horarios disponibles
  let configuracionHorarios = {
    fecha_inicio: '',
    fecha_fin: '',
    horarios: [
      { dia: 'lunes', inicio: '09:00', fin: '10:00', activo: false },
      { dia: 'lunes', inicio: '11:30', fin: '12:30', activo: false },
      { dia: 'martes', inicio: '09:00', fin: '10:00', activo: false },
      { dia: 'martes', inicio: '11:30', fin: '12:30', activo: false },
      { dia: 'miercoles', inicio: '13:30', fin: '14:30', activo: false },
      { dia: 'jueves', inicio: '11:30', fin: '14:30', activo: false },
      { dia: 'viernes', inicio: '12:30', fin: '13:30', activo: false }
    ]
  };

  // Formulario para nueva reserva
  let showReservaForm = false;
  let reservaForm = {
    alumne_id: '',
    fecha: '',
    hora: '',
    durada_minuts: 30,
    nom_familia: '',
    email_familia: '',
    telefon_familia: '',
    notes: ''
  };

  let alumnes: any[] = [];
  let loadingReserva = false;
  let enlacePublico = '';
  let mostrarEnlace = false;

  onMount(async () => {
    console.log('DEBUG page: programador-citas mounted');
    me = await getMe();
    if (me?.role === 'docent') {
      tutorSeleccionat = me.email;
    }
    
    // Establecer fecha por defecto (hoy)
    const hoy = new Date();
    fechaSeleccionada = hoy.toISOString().split('T')[0];
    
    await carregarHorarios();
    await carregarAlumnes();
  });

  // Log reactivo del estado del modal
  $: console.log('DEBUG modal: showReservaForm =', showReservaForm);

  async function carregarHorarios() {
    if (!tutorSeleccionat || !fechaSeleccionada) return;
    
    try {
      loading = true;
      horarios = await obtenirHorariosTutor(tutorSeleccionat, fechaSeleccionada);
    } catch (err: any) {
      error = err.message;
      toastError('Error carregant horaris: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function carregarAlumnes() {
    if (!tutorSeleccionat) return;
    
    try {
      // Simular carga de alumnos - en producción vendría del backend
      alumnes = [
        { alumne_id: '1', nom: 'Alumne 1' },
        { alumne_id: '2', nom: 'Alumne 2' }
      ];
    } catch (err: any) {
      toastError('Error carregant alumnes: ' + err.message);
    }
  }

  async function configurarHorarios() {
    if (!configuracionHorarios.fecha_inicio || !configuracionHorarios.fecha_fin) {
      toastError('Si us plau, selecciona les dates d\'inici i fi');
      return;
    }

    const horariosActivos = configuracionHorarios.horarios.filter(h => h.activo);
    
    if (horariosActivos.length === 0) {
      toastError('Si us plau, selecciona almenys un horari');
      return;
    }

    try {
      loading = true;
      const resultat = await configurarHorariosAPI({
        tutorEmail: tutorSeleccionat,
        fechaInicio: configuracionHorarios.fecha_inicio,
        fechaFin: configuracionHorarios.fecha_fin,
        horarios: configuracionHorarios.horarios
      });

      toastSuccess(`Horaris configurats correctament! ${resultat.total_horarios} horaris per al període ${resultat.periodo}`);
      
      // Recargar horarios para la fecha actual
      await carregarHorarios();
      
    } catch (err: any) {
      toastError('Error configurant horaris: ' + err.message);
    } finally {
      loading = false;
    }
  }

  function toggleHorario(index: number) {
    configuracionHorarios.horarios[index].activo = !configuracionHorarios.horarios[index].activo;
  }

  function abrirReservaForm(horario: any) {
    reservaForm.fecha = fechaSeleccionada;
    reservaForm.hora = horario.hora;
    console.log('DEBUG modal: abrirReservaForm', { fechaSeleccionada, horario });
    showReservaForm = true;
  }

  async function crearReserva() {
    if (!reservaForm.alumne_id || !reservaForm.nom_familia || !reservaForm.email_familia || !reservaForm.telefon_familia) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    try {
      loadingReserva = true;
      console.log('DEBUG modal: crearReserva -> payload', { ...reservaForm, tutorEmail: tutorSeleccionat });
      await reservarHorario({
        tutorEmail: tutorSeleccionat,
        alumneId: reservaForm.alumne_id,
        fecha: reservaForm.fecha,
        hora: reservaForm.hora,
        durada_minuts: reservaForm.durada_minuts,
        nom_familia: reservaForm.nom_familia,
        email_familia: reservaForm.email_familia,
        telefon_familia: reservaForm.telefon_familia,
        notes: reservaForm.notes
      });

      toastSuccess('Reserva creada correctament');
      console.log('DEBUG modal: reserva creada OK');
      showReservaForm = false;
      reservaForm = {
        alumne_id: '',
        fecha: '',
        hora: '',
        durada_minuts: 30,
        nom_familia: '',
        email_familia: '',
        telefon_familia: '',
        notes: ''
      };
      await carregarHorarios();
    } catch (err: any) {
      toastError('Error creant reserva: ' + err.message);
      console.log('DEBUG modal: error creant reserva', err);
    } finally {
      loadingReserva = false;
    }
  }

  // ===== Control de cierre del modal =====
  function closeModal(reason: string) {
    console.log('DEBUG modal: closeModal', { reason });
    showReservaForm = false;
  }

  function handleOverlayClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const current = e.currentTarget as HTMLElement;
    const isOutside = target === current;
    console.log('DEBUG modal: overlay click', { isOutside, target, current });
    if (isOutside) {
      closeModal('overlay');
    }
  }

  function handleOverlayKeydown(e: KeyboardEvent) {
    console.log('DEBUG modal: keydown', { key: e.key });
    if (e.key === 'Escape') {
      closeModal('escape');
    }
  }

  function handleModalContentClick(e: MouseEvent) {
    // Evitar que los clics dentro del contenido cierren el modal por propagación
    e.stopPropagation?.();
    const t = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;
    console.log('DEBUG modal: content click', { tag: t?.tagName, id: (t as any)?.id, class: (t as any)?.className });
  }

  function handleModalContentChange(e: Event) {
    const t = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const value = (t && 'value' in t) ? (t as any).value : undefined;
    console.log('DEBUG modal: content change', { tag: t?.tagName, id: (t as any)?.id, name: (t as any)?.name, value });
  }

  // ===== Cargar alumnos reales =====
  async function carregarAlumnes() {
    if (!tutorSeleccionat) return;
    
    try {
      console.log('DEBUG: carregant alumnes per tutor:', tutorSeleccionat);
      const data = await obtenirAlumnesTutor(tutorSeleccionat);
      
      alumnes = data.map((a: any) => ({
        alumne_id: a.alumne_id,
        nom: `${a.nom} ${a.cognoms}`.trim(),
        grup: a.grup,
        curs: a.curs
      }));
      console.log('DEBUG: alumnes carregats:', alumnes);
    } catch (err: any) {
      console.error('Error carregant alumnes:', err);
      toastError('Error carregant alumnes: ' + err.message);
      // Fallback a datos simulados
      alumnes = [
        { alumne_id: '1', nom: 'Alumne 1' },
        { alumne_id: '2', nom: 'Alumne 2' }
      ];
    }
  }

  function getDiaNombre(dia: string) {
    const dias: Record<string, string> = {
      'lunes': 'Dilluns',
      'martes': 'Dimarts', 
      'miercoles': 'Dimecres',
      'jueves': 'Dijous',
      'viernes': 'Divendres'
    };
    return dias[dia] || dia;
  }

  function getDiaColor(dia: string) {
    const colores: Record<string, string> = {
      'lunes': '#3b82f6',
      'martes': '#10b981',
      'miercoles': '#f59e0b',
      'jueves': '#8b5cf6',
      'viernes': '#ef4444'
    };
    return colores[dia] || '#6b7280';
  }

  // Recargar horarios cuando cambia la fecha o tutor
  $: if (tutorSeleccionat && fechaSeleccionada) {
    carregarHorarios();
  }

  // Generar enlace público cuando cambia el tutor
  $: if (tutorSeleccionat) {
    enlacePublico = generarEnlaceCalendarioPublico(tutorSeleccionat);
  }

  function copiarEnlace() {
    navigator.clipboard.writeText(enlacePublico).then(() => {
      toastSuccess('Enllaç copiat al porta-retalls');
    }).catch(() => {
      toastError('Error copiant l\'enllaç');
    });
  }
</script>

<div class="container">
  <h1>Programador de Cites</h1>
  
  {#if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {/if}

  <!-- Configuración de horarios -->
  <div class="config-section">
    <h2>Configuració d'Horaris</h2>
    
    <div class="config-form">
      <div class="form-row">
        <div class="form-group">
          <TextField label="Data d'inici" type="date" bind:value={configuracionHorarios.fecha_inicio} />
        </div>
        <div class="form-group">
          <TextField label="Data de fi" type="date" bind:value={configuracionHorarios.fecha_fin} />
        </div>
      </div>

      <div class="horarios-config">
        <h3>Horaris Disponibles</h3>
        <div class="horarios-grid">
          {#each configuracionHorarios.horarios as horario, index}
            <div class="horario-item" style="border-left-color: {getDiaColor(horario.dia)};">
              <label class="horario-checkbox">
                <input 
                  type="checkbox" 
                  bind:checked={horario.activo}
                  onchange={() => toggleHorario(index)}
                />
                <div class="horario-info">
                  <span class="dia" style="color: {getDiaColor(horario.dia)};">
                    {getDiaNombre(horario.dia)}
                  </span>
                  <span class="hora">{horario.inicio} - {horario.fin}</span>
                </div>
              </label>
            </div>
          {/each}
        </div>
      </div>

      <button class="btn btn-primary" onclick={configurarHorarios}>Guardar Configuració</button>
    </div>
  </div>

  <!-- Enlace público para familias -->
  <div class="enlace-section">
    <h2>🔗 Enllaç Públic per a Famílies</h2>
    <p>Comparteix aquest enllaç amb les famílies perquè puguin reservar cites directament:</p>
    
    <div class="enlace-container">
      <div class="enlace-input">
        <input 
          type="text" 
          value={enlacePublico} 
          readonly 
          class="enlace-field"
          placeholder="Selecciona un tutor per generar l'enllaç"
        />
        <button class="btn btn-secondary" onclick={copiarEnlace}>
          <Icon name="copy" size={16} />
          Copiar
        </button>
      </div>
      
      <div class="enlace-actions">
        <a href={enlacePublico} target="_blank" class="btn btn-success">
          <Icon name="external-link" size={16} />
          Obrir Enllaç
        </a>
        <button class="btn btn-info" onclick={() => mostrarEnlace = !mostrarEnlace}>
          <Icon name="info" size={16} />
          {mostrarEnlace ? 'Amagar' : 'Mostrar'} Instruccions
        </button>
      </div>
    </div>

    {#if mostrarEnlace}
      <div class="instruccions">
        <h3>📋 Instruccions per a les famílies:</h3>
        <ol>
          <li>Fes clic a "Obrir Enllaç" o copia l'enllaç i obre'l en el navegador</li>
          <li>Fes clic a "Obrir Calendari de Google"</li>
          <li>Selecciona un horari disponible</li>
          <li>Completa les dades de contacte</li>
          <li>Confirma la reserva</li>
        </ol>
        <p><strong>Nota:</strong> Les famílies necessitaran tenir una compte de Google per reservar cites.</p>
      </div>
    {/if}
  </div>

  <!-- Vista de horarios -->
  <div class="horarios-section">
    <h2>Horaris del Tutor</h2>
    
    <div class="filtros">
      <div class="form-group">
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

      <div class="form-group">
        <label for="fecha">Data:</label>
        <input id="fecha" type="date" bind:value={fechaSeleccionada} />
      </div>
    </div>

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Carregant horaris...</p>
      </div>
    {:else if horarios}
      <div class="horarios-disponibles">
        <h3>Horaris Disponibles - {fechaSeleccionada}</h3>
        
        {#if horarios.horarios_disponibles.length === 0}
          <div class="empty-state">
            <div class="empty-icon">—</div>
            <h3>No hi ha horaris disponibles</h3>
            <p>No s'han configurat horaris per aquesta data.</p>
          </div>
        {:else}
          <div class="horarios-grid">
            {#each horarios.horarios_disponibles as horario}
              <div class="horario-disponible">
                <div class="horario-info">
                  <span class="hora">{horario.hora}</span>
                  <span class="estat disponible">Disponible</span>
                </div>
                <button class="btn btn-success btn-sm" onclick={() => abrirReservaForm(horario)}>Reservar</button>
              </div>
            {/each}
          </div>
        {/if}

        {#if horarios.horarios_ocupados.length > 0}
          <div class="horarios-ocupados">
            <h4>Horaris Ocupats</h4>
            <div class="horarios-grid">
              {#each horarios.horarios_ocupados as horario}
                <div class="horario-ocupado">
                  <div class="horario-info">
                    <span class="hora">{new Date(horario.data_cita).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="estat ocupado">Ocupat</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Modal de reserva -->
  {#if showReservaForm}
    <div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1" on:click={handleOverlayClick} on:keydown={handleOverlayKeydown}>
      <div class="modal-content" role="document" on:click={handleModalContentClick} on:change={handleModalContentChange}>
        <div class="modal-header">
          <h3>Nova Reserva</h3>
          <button class="close-btn" on:click={() => { console.log('DEBUG modal: close button'); closeModal('close-button'); }}>×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="alumne-select">Alumne:</label>
              <select id="alumne-select" bind:value={reservaForm.alumne_id}>
                <option value="">Selecciona un alumne</option>
                {#each alumnes as alumne}
                  <option value={alumne.alumne_id}>{alumne.nom}</option>
                {/each}
              </select>
            </div>
            
            <div class="form-group">
              <label for="fecha-reserva">Data:</label>
              <input id="fecha-reserva" type="date" bind:value={reservaForm.fecha} />
            </div>
            
            <div class="form-group">
              <label for="hora-reserva">Hora:</label>
              <input id="hora-reserva" type="time" bind:value={reservaForm.hora} />
            </div>
            
            <div class="form-group">
              <label for="durada-reserva">Durada:</label>
              <select id="durada-reserva" bind:value={reservaForm.durada_minuts}>
                <option value={15}>15 minuts</option>
                <option value={30}>30 minuts</option>
                <option value={45}>45 minuts</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="nom-familia">Nom de la família:</label>
              <input id="nom-familia" type="text" bind:value={reservaForm.nom_familia} placeholder="Nom complet" />
            </div>
            
            <div class="form-group">
              <label for="email-familia">Email:</label>
              <input id="email-familia" type="email" bind:value={reservaForm.email_familia} placeholder="email@exemple.com" />
            </div>
            
            <div class="form-group">
              <label for="telefon-familia">Telèfon:</label>
              <input id="telefon-familia" type="tel" bind:value={reservaForm.telefon_familia} placeholder="123 456 789" />
            </div>
            
            <div class="form-group full-width">
              <label for="notes-reserva">Notes:</label>
              <textarea id="notes-reserva" bind:value={reservaForm.notes} placeholder="Notes addicionals"></textarea>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => showReservaForm = false}>Cancel·lar</button>
          <button class="btn btn-primary" onclick={crearReserva} disabled={loadingReserva}>{loadingReserva ? 'Creant…' : 'Crear Reserva'}</button>
        </div>
      </div>
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

  .config-section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .config-section h2 {
    margin: 0 0 25px 0;
    color: #1e293b;
    font-size: 1.8rem;
    font-weight: 700;
  }

  .enlace-section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .enlace-section h2 {
    margin: 0 0 15px 0;
    color: #1e293b;
    font-size: 1.8rem;
    font-weight: 700;
  }

  .enlace-section p {
    margin: 0 0 20px 0;
    color: #64748b;
    font-size: 1.1rem;
  }

  .enlace-container {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .enlace-input {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }

  .enlace-field {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    font-family: 'Courier New', monospace;
  }

  .enlace-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .instruccions {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
  }

  .instruccions h3 {
    margin: 0 0 15px 0;
    color: #0c4a6e;
    font-size: 1.2rem;
  }

  .instruccions ol {
    margin: 0 0 15px 0;
    padding-left: 20px;
    color: #075985;
  }

  .instruccions li {
    margin-bottom: 8px;
    line-height: 1.6;
  }

  .instruccions p {
    margin: 0;
    color: #075985;
    font-size: 14px;
  }

  .btn-info {
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
  }

  .btn-info:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(14, 165, 233, 0.3);
  }

  .config-form {
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
    background: white;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .horarios-config {
    background: #f8fafc;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .horarios-config h3 {
    margin: 0 0 20px 0;
    color: #374151;
    font-size: 1.2rem;
  }

  .horarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
  }

  .horario-item {
    background: white;
    border: 2px solid #e5e7eb;
    border-left: 4px solid #6b7280;
    border-radius: 8px;
    padding: 15px;
    transition: all 0.3s ease;
  }

  .horario-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }

  .horario-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  .horario-checkbox input[type="checkbox"] {
    margin: 0;
    transform: scale(1.2);
  }

  .horario-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .dia {
    font-weight: 600;
    font-size: 16px;
  }

  .hora {
    color: #6b7280;
    font-size: 14px;
  }

  .horarios-section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .horarios-section h2 {
    margin: 0 0 25px 0;
    color: #1e293b;
    font-size: 1.8rem;
    font-weight: 700;
  }

  .filtros {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 12px;
  }

  .horarios-disponibles h3 {
    margin: 0 0 20px 0;
    color: #374151;
    font-size: 1.3rem;
  }

  .horarios-disponibles .horarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }

  .horario-disponible {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s ease;
  }

  .horario-disponible:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
  }

  .horario-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .horario-info .hora {
    font-size: 18px;
    font-weight: 600;
    color: #1e40af;
  }

  .estat {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .estat.disponible {
    background: #dcfce7;
    color: #166534;
  }

  .estat.ocupado {
    background: #fee2e2;
    color: #dc2626;
  }

  .horarios-ocupados {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
  }

  .horarios-ocupados h4 {
    margin: 0 0 15px 0;
    color: #374151;
  }

  .horario-ocupado {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    border: 2px solid #ef4444;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .horario-ocupado .hora {
    font-size: 18px;
    font-weight: 600;
    color: #dc2626;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 25px 30px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    color: #1e293b;
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 30px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    padding: 25px 30px;
    border-top: 1px solid #e5e7eb;
  }

  /* Botones */
  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }

  .btn-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #6b7280, #4b5563);
    color: white;
  }

  .btn-sm {
    padding: 8px 16px;
    font-size: 12px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  /* Estados */
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

  .error {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    text-align: center;
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

  .empty-state p {
    margin: 0;
    font-size: 1.1rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 15px;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .horarios-grid {
      grid-template-columns: 1fr;
    }

    .filtros {
      grid-template-columns: 1fr;
    }

    .modal-content {
      width: 95%;
      margin: 20px;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>