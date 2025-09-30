<script lang="ts">
  import { onMount } from 'svelte';
  import { getMe, type Me } from '$lib';
  import { toastError, toastSuccess } from '$lib/toast';
  import Icon from '$lib/components/SimpleIcon.svelte';
  import Button from '$lib/components/Button.svelte';
  import TextField from '$lib/components/TextField.svelte';

  let me: Me | null = null;
  let loading = false;
  let activeTab: 'configurar' | 'horarios' | 'citas' | 'borradores' = 'configurar';

  // Configuración de horarios personalizados
  let configuracionHorarios = {
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    duracion_cita: 30,
    dias_semana: {
      lunes: { activo: false, horarios: [] },
      martes: { activo: false, horarios: [] },
      miercoles: { activo: false, horarios: [] },
      jueves: { activo: false, horarios: [] },
      viernes: { activo: false, horarios: [] }
    }
  };

  // Horarios específicos del tutor
  let horariosTutor: any[] = [];
  let citasProgramadas: any[] = [];
  let borradoresEntrevista: any[] = [];

  onMount(async () => {
    me = await getMe();
    if (me?.email) {
      await carregarDades();
    }
  });

  async function carregarDades() {
    if (!me?.email) return;
    
    loading = true;
    try {
      // Cargar configuraciones de horarios
      await carregarConfiguracions();
      
      // Cargar horarios específicos
      await carregarHorariosTutor();
      
      // Cargar citas programadas
      await carregarCitasProgramadas();
      
      // Cargar borradores de entrevistas
      await carregarBorradoresEntrevista();
      
    } catch (error: any) {
      console.error('Error carregant dades:', error);
      toastError('Error carregant dades: ' + error.message);
    } finally {
      loading = false;
    }
  }

  async function carregarConfiguracions() {
    // Implementar carga de configuraciones
    console.log('Carregant configuracions...');
  }

  async function carregarHorariosTutor() {
    // Implementar carga de horarios específicos
    console.log('Carregant horarios tutor...');
  }

  async function carregarCitasProgramadas() {
    // Implementar carga de citas
    console.log('Carregant cites programades...');
  }

  async function carregarBorradoresEntrevista() {
    // Implementar carga de borradores
    console.log('Carregant borradors entrevista...');
  }

  function afegirHorari(dia: string) {
    configuracionHorarios.dias_semana[dia].horarios.push({
      inicio: '09:00',
      fin: '10:00',
      activo: true
    });
  }

  function eliminarHorari(dia: string, index: number) {
    configuracionHorarios.dias_semana[dia].horarios.splice(index, 1);
  }

  async function guardarConfiguracion() {
    if (!me?.email) return;
    
    loading = true;
    try {
      // Validar configuración
      if (!configuracionHorarios.nombre || !configuracionHorarios.fecha_inicio || !configuracionHorarios.fecha_fin) {
        toastError('Si us plau, completa tots els camps obligatoris');
        return;
      }

      // Guardar configuración
      const response = await fetch('/api/dades-personals/configuracion-horarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          tutor_email: me.email,
          nombre: configuracionHorarios.nombre,
          fecha_inicio: configuracionHorarios.fecha_inicio,
          fecha_fin: configuracionHorarios.fecha_fin,
          duracion_cita: configuracionHorarios.duracion_cita,
          dias_semana: configuracionHorarios.dias_semana
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error guardant configuració');
      }

      toastSuccess('Configuració guardada correctament');
      await carregarDades();
      
    } catch (error: any) {
      console.error('Error guardant configuració:', error);
      toastError('Error guardant configuració: ' + error.message);
    } finally {
      loading = false;
    }
  }

  function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  function getDiaNombre(dia: string): string {
    const dias: Record<string, string> = {
      'lunes': 'Dilluns',
      'martes': 'Dimarts',
      'miercoles': 'Dimecres',
      'jueves': 'Dijous',
      'viernes': 'Divendres'
    };
    return dias[dia] || dia;
  }

  function getDiaColor(dia: string): string {
    const colores: Record<string, string> = {
      'lunes': '#3b82f6',
      'martes': '#10b981',
      'miercoles': '#f59e0b',
      'jueves': '#ef4444',
      'viernes': '#8b5cf6'
    };
    return colores[dia] || '#6b7280';
  }
</script>

<div class="container">
  <div class="header">
    <h1>📅 Gestió Unificada de Cites</h1>
    <p>Configura horaris, gestiona cites i completa entrevistes</p>
  </div>

  {#if loading}
    <div class="loading">
      <Icon name="loader" size={24} />
      <span>Carregant...</span>
    </div>
  {:else}
    <!-- Navegación por pestañas -->
    <div class="tabs">
      <button 
        class="tab" 
        class:active={activeTab === 'configurar'}
        on:click={() => activeTab = 'configurar'}
      >
        <Icon name="settings" size={18} />
        <span>Configurar Horaris</span>
      </button>
      
      <button 
        class="tab" 
        class:active={activeTab === 'horarios'}
        on:click={() => activeTab = 'horarios'}
      >
        <Icon name="clock" size={18} />
        <span>Els Meus Horaris</span>
      </button>
      
      <button 
        class="tab" 
        class:active={activeTab === 'citas'}
        on:click={() => activeTab = 'citas'}
      >
        <Icon name="calendar" size={18} />
        <span>Cites Programades</span>
      </button>
      
      <button 
        class="tab" 
        class:active={activeTab === 'borradores'}
        on:click={() => activeTab = 'borradores'}
      >
        <Icon name="file-text" size={18} />
        <span>Borradors Entrevistes</span>
      </button>
    </div>

    <!-- Contenido de las pestañas -->
    <div class="tab-content">
      {#if activeTab === 'configurar'}
        <!-- Configuración de horarios -->
        <div class="config-section">
          <h2>⚙️ Configuració de Horaris Personalitzats</h2>
          
          <div class="form-grid">
            <div class="form-group">
              <label for="nombre-config">Nom de la configuració:</label>
              <input 
                id="nombre-config"
                type="text" 
                bind:value={configuracionHorarios.nombre}
                placeholder="Ex: Horaris Setmana 1"
                class="input"
              />
            </div>
            
            <div class="form-group">
              <label for="fecha-inicio">Data d'inici:</label>
              <input 
                id="fecha-inicio"
                type="date" 
                bind:value={configuracionHorarios.fecha_inicio}
                class="input"
              />
            </div>
            
            <div class="form-group">
              <label for="fecha-fin">Data de fi:</label>
              <input 
                id="fecha-fin"
                type="date" 
                bind:value={configuracionHorarios.fecha_fin}
                class="input"
              />
            </div>
            
            <div class="form-group">
              <label for="duracion">Durada de les cites (minuts):</label>
              <select id="duracion" bind:value={configuracionHorarios.duracion_cita} class="input">
                <option value={15}>15 minuts</option>
                <option value={30}>30 minuts</option>
                <option value={45}>45 minuts</option>
                <option value={60}>60 minuts</option>
              </select>
            </div>
          </div>

          <!-- Configuración por días -->
          <div class="dias-config">
            <h3>📅 Configuració per Dies de la Setmana</h3>
            
            {#each Object.entries(configuracionHorarios.dias_semana) as [dia, config]}
              <div class="dia-section">
                <div class="dia-header">
                  <label class="dia-checkbox">
                    <input 
                      type="checkbox" 
                      bind:checked={config.activo}
                    />
                    <span class="dia-nom" style="color: {getDiaColor(dia)};">
                      {getDiaNombre(dia)}
                    </span>
                  </label>
                  
                  {#if config.activo}
                    <button 
                      class="btn btn-sm btn-primary"
                      on:click={() => afegirHorari(dia)}
                    >
                      <Icon name="plus" size={14} />
                      Afegir Horari
                    </button>
                  {/if}
                </div>

                {#if config.activo}
                  <div class="horarios-list">
                    {#each config.horarios as horario, index}
                      <div class="horario-item">
                        <input 
                          type="time" 
                          bind:value={horario.inicio}
                          class="input input-sm"
                        />
                        <span>fins a</span>
                        <input 
                          type="time" 
                          bind:value={horario.fin}
                          class="input input-sm"
                        />
                        <button 
                          class="btn btn-sm btn-danger"
                          on:click={() => eliminarHorari(dia, index)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="form-actions">
            <Button on:click={guardarConfiguracion} disabled={loading}>
              {loading ? 'Guardant...' : 'Guardar Configuració'}
            </Button>
          </div>
        </div>

      {:else if activeTab === 'horarios'}
        <!-- Horarios del tutor -->
        <div class="horarios-section">
          <h2>🕐 Els Meus Horaris</h2>
          <p>Horaris configurats i disponibles per a reserves</p>
          
          {#if horariosTutor.length === 0}
            <div class="empty-state">
              <Icon name="clock" size={48} />
              <h3>No tens horaris configurats</h3>
              <p>Configura els teus horaris a la pestanya "Configurar Horaris"</p>
            </div>
          {:else}
            <div class="horarios-grid">
              {#each horariosTutor as horario}
                <div class="horario-card">
                  <div class="horario-info">
                    <span class="dia">{getDiaNombre(horario.dia)}</span>
                    <span class="hora">{horario.hora_inicio} - {horario.hora_fin}</span>
                  </div>
                  <div class="horario-status">
                    <span class="status" class:activo={horario.activo}>
                      {horario.activo ? 'Actiu' : 'Inactiu'}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'citas'}
        <!-- Citas programadas -->
        <div class="citas-section">
          <h2>📅 Cites Programades</h2>
          <p>Cites programades amb famílies</p>
          
          {#if citasProgramadas.length === 0}
            <div class="empty-state">
              <Icon name="calendar" size={48} />
              <h3>No tens cites programades</h3>
              <p>Les cites apareixeran aquí quan les famílies reservin</p>
            </div>
          {:else}
            <div class="citas-list">
              {#each citasProgramadas as cita}
                <div class="cita-card">
                  <div class="cita-header">
                    <h3>Cita amb {cita.nom_familia}</h3>
                    <span class="cita-status status-{cita.estat}">{cita.estat}</span>
                  </div>
                  <div class="cita-body">
                    <p><strong>Data:</strong> {new Date(cita.data_cita).toLocaleDateString()}</p>
                    <p><strong>Hora:</strong> {new Date(cita.data_cita).toLocaleTimeString()}</p>
                    <p><strong>Email:</strong> {cita.email_familia}</p>
                    <p><strong>Telèfon:</strong> {cita.telefon_familia}</p>
                  </div>
                  <div class="cita-actions">
                    <button class="btn btn-primary btn-sm">
                      <Icon name="edit" size={14} />
                      Editar
                    </button>
                    <button class="btn btn-success btn-sm">
                      <Icon name="file-text" size={14} />
                      Crear Entrevista
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'borradores'}
        <!-- Borradores de entrevistas -->
        <div class="borradores-section">
          <h2>📝 Borradors d'Entrevistes</h2>
          <p>Completa les entrevistes realitzades</p>
          
          {#if borradoresEntrevista.length === 0}
            <div class="empty-state">
              <Icon name="file-text" size={48} />
              <h3>No tens borradors d'entrevistes</h3>
              <p>Els borradors es crearan automàticament després de cada cita</p>
            </div>
          {:else}
            <div class="borradores-list">
              {#each borradoresEntrevista as borrador}
                <div class="borrador-card">
                  <div class="borrador-header">
                    <h3>Entrevista amb {borrador.nom_familia}</h3>
                    <span class="borrador-status status-{borrador.estado}">{borrador.estado}</span>
                  </div>
                  <div class="borrador-body">
                    <p><strong>Data:</strong> {new Date(borrador.fecha_entrevista).toLocaleDateString()}</p>
                    <p><strong>Alumne:</strong> {borrador.alumne_id}</p>
                  </div>
                  <div class="borrador-actions">
                    <button class="btn btn-primary btn-sm">
                      <Icon name="edit" size={14} />
                      Completar
                    </button>
                    <button class="btn btn-secondary btn-sm">
                      <Icon name="eye" size={14} />
                      Veure
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--fg);
    margin-bottom: 0.5rem;
  }

  .header p {
    font-size: 1.1rem;
    color: var(--fg-secondary);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--fg-secondary);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--fg-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .tab:hover {
    color: var(--fg);
    background: var(--bg-secondary);
  }

  .tab.active {
    color: var(--primary-600);
    border-bottom-color: var(--primary-600);
    background: var(--primary-50);
  }

  .tab-content {
    min-height: 400px;
  }

  .config-section {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid var(--border);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: var(--fg);
  }

  .input {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    font-size: 1rem;
  }

  .input:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px var(--primary-100);
  }

  .input-sm {
    padding: 0.5rem;
    font-size: 0.9rem;
  }

  .dias-config {
    margin-top: 2rem;
  }

  .dias-config h3 {
    margin-bottom: 1.5rem;
    color: var(--fg);
  }

  .dia-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-secondary);
  }

  .dia-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .dia-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .dia-checkbox input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
  }

  .dia-nom {
    font-weight: 600;
    font-size: 1.1rem;
  }

  .horarios-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .horario-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--bg);
    border-radius: 6px;
    border: 1px solid var(--border);
  }

  .form-actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--fg-secondary);
  }

  .empty-state h3 {
    margin: 1rem 0 0.5rem;
    color: var(--fg);
  }

  .horarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .horario-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .horario-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .dia {
    font-weight: 600;
    color: var(--fg);
  }

  .hora {
    color: var(--fg-secondary);
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--error-100);
    color: var(--error-700);
  }

  .status.activo {
    background: var(--success-100);
    color: var(--success-700);
  }

  .citas-list, .borradores-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cita-card, .borrador-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .cita-header, .borrador-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .cita-header h3, .borrador-header h3 {
    margin: 0;
    color: var(--fg);
  }

  .cita-status, .borrador-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .status-pendent {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .status-reservado {
    background: var(--info-100);
    color: var(--info-700);
  }

  .status-completada {
    background: var(--success-100);
    color: var(--success-700);
  }

  .cita-body, .borrador-body {
    margin-bottom: 1rem;
  }

  .cita-body p, .borrador-body p {
    margin: 0.25rem 0;
    color: var(--fg-secondary);
  }

  .cita-actions, .borrador-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--primary-600);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-700);
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--fg);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: var(--bg-tertiary);
  }

  .btn-success {
    background: var(--success-600);
    color: white;
  }

  .btn-success:hover {
    background: var(--success-700);
  }

  .btn-danger {
    background: var(--error-600);
    color: white;
  }

  .btn-danger:hover {
    background: var(--error-700);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
