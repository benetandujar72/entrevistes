<script lang="ts">
  import { onMount } from 'svelte';
  import { obtenerListaTutores, obtenerAlumnesTutor, type Tutor, type AlumneTutor } from '$lib';
  import { toastError } from '$lib/toast';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let tutores: Tutor[] = [];
  let tutorSeleccionado = '';
  let alumnesTutor: AlumneTutor[] = [];
  let loading = true;
  let cargandoAlumnes = false;
  let error: string | null = null;

  onMount(async () => {
    await cargarTutores();
  });

  async function cargarTutores() {
    loading = true;
    error = null;
    try {
      tutores = await obtenerListaTutores();
      if (tutores.length > 0) {
        tutorSeleccionado = tutores[0].tutor_email;
        await cargarAlumnesTutor();
      }
    } catch (e: any) {
      error = e?.message || 'Error carregant tutors';
    } finally {
      loading = false;
    }
  }

  async function cargarAlumnesTutor() {
    if (!tutorSeleccionado) return;
    
    cargandoAlumnes = true;
    try {
      alumnesTutor = await obtenerAlumnesTutor(tutorSeleccionado);
    } catch (e: any) {
      error = e?.message || 'Error carregant alumnes del tutor';
    } finally {
      cargandoAlumnes = false;
    }
  }
</script>

<div class="page-header">
  <div class="header-content">
    <h1 class="page-title">
      <Icon name="user" size={24} />
      Tutores i Alumnes
    </h1>
    <div class="tutor-selector">
      <label for="tutor-select" class="filter-label">Seleccionar Tutor</label>
      <select 
        id="tutor-select"
        bind:value={tutorSeleccionado} 
        onchange={cargarAlumnesTutor} 
        class="select"
      >
        {#each tutores as tutor}
          <option value={tutor.tutor_email}>
            {tutor.tutor_email} ({tutor.total_alumnes} alumnes)
          </option>
        {/each}
      </select>
    </div>
  </div>
  
  {#if error}
    <div class="error-card">
      <Icon name="alert-circle" size={18} />
      <span>{error}</span>
    </div>
  {/if}
</div>

{#if loading}
  <div class="loading-state">
    <Icon name="user" size={32} />
    <span>Carregant tutors...</span>
  </div>
{:else if tutores.length === 0}
  <div class="empty-state">
    <Icon name="user" size={48} />
    <div class="empty-title">No hi ha tutors assignats</div>
    <div class="empty-subtitle">Importa un CSV de tutories per veure els tutors i els seus alumnes.</div>
  </div>
{:else}
  <!-- Lista de tutores -->
  <div class="tutores-section">
    <div class="section-header">
      <Icon name="users" size={20} />
      <h3>Llista de Tutors</h3>
      <span class="badge badge-primary">{tutores.length} tutors</span>
    </div>
    
    <div class="tutores-grid">
      {#each tutores as tutor}
        <div class="tutor-card">
          <div class="tutor-info">
            <div class="tutor-email">
              <Icon name="mail" size={16} />
              <span>{tutor.tutor_email}</span>
            </div>
            <div class="tutor-stats">
              <Icon name="users" size={14} />
              <span>{tutor.total_alumnes} alumnes assignats</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Información del tutor seleccionado -->
  {#if tutorSeleccionado}
    <div class="selected-tutor-info">
      <div class="tutor-header">
        <Icon name="user" size={20} />
        <h2>Tutor Seleccionat: {tutorSeleccionado}</h2>
      </div>
      <div class="tutor-stats">
        <Icon name="users" size={16} />
        <span><strong>Total alumnes assignats:</strong> {alumnesTutor.length}</span>
      </div>
    </div>

    <!-- Lista de alumnos del tutor seleccionado -->
    {#if cargandoAlumnes}
      <div class="loading-state">
        <Icon name="users" size={32} />
        <span>Carregant alumnes del tutor...</span>
      </div>
    {:else if alumnesTutor.length === 0}
      <div class="empty-state">
        <Icon name="users" size={48} />
        <div class="empty-title">El tutor seleccionat no té alumnes assignats</div>
      </div>
    {:else}
      <div class="alumnes-section">
        <div class="section-header">
          <Icon name="users" size={20} />
          <h3>Alumnes Assignats</h3>
          <span class="badge badge-success">{alumnesTutor.length} alumnes</span>
        </div>
        
        <div class="alumnes-grid">
          {#each alumnesTutor as alumne}
            <div class="alumne-card">
              <div class="card-header">
                <h4 class="alumne-name">{alumne.nom}</h4>
                <span class="badge badge-success">
                  {alumne.total_entrevistes} entrevistes
                </span>
              </div>
              
              <div class="alumne-details">
                <div class="detail-item">
                  <Icon name="tag" size={14} />
                  <span><strong>Grup:</strong> {alumne.grup_nom}</span>
                </div>
                <div class="detail-item">
                  <Icon name="calendar" size={14} />
                  <span><strong>Curs:</strong> {alumne.curs}</span>
                </div>
                {#if alumne.email}
                  <div class="detail-item">
                    <Icon name="mail" size={14} />
                    <span><strong>Email:</strong> 
                      <a href="mailto:{alumne.email}" class="email-link">
                        {alumne.email}
                      </a>
                    </span>
                  </div>
                {/if}
              </div>
              
              <div class="card-actions">
                <a href="/alumnes/{alumne.id}" class="btn btn-filled-primary btn-sm">
                  <Icon name="user" size={14} />
                  Veure Fitxa
                </a>
                <a href="/entrevistes/nova?alumne={alumne.id}&nom={encodeURIComponent(alumne.nom)}&grup={encodeURIComponent(alumne.grup_nom)}&curs={encodeURIComponent(alumne.any_curs)}" class="btn btn-filled-success btn-sm">
                  <Icon name="plus" size={14} />
                  Nova Entrevista
                </a>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
{/if}

<style>
  /* === PAGE HEADER === */
  .page-header {
    margin-bottom: 2rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  .tutor-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 300px;
  }

  .filter-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg-secondary);
  }

  .select {
    padding: 0.75rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--input-bg);
    color: var(--fg);
    transition: all 0.2s ease;
  }

  .select:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  /* === LOADING STATE === */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    color: var(--fg-secondary);
    gap: 1rem;
  }

  /* === EMPTY STATE === */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    background: var(--google-grey-50);
    border: 2px dashed var(--google-grey-300);
    border-radius: var(--radius-lg);
    text-align: center;
    color: var(--google-grey-600);
  }

  .empty-title {
    font-weight: 600;
    font-size: var(--text-lg);
    margin: 1rem 0 0.5rem 0;
  }

  .empty-subtitle {
    font-size: var(--text-sm);
    opacity: 0.8;
  }

  /* === ERROR CARD === */
  .error-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--error-50);
    border: 1px solid var(--error-500);
    border-radius: var(--radius-md);
    color: var(--error-600);
    font-size: var(--text-sm);
  }

  /* === SECTIONS === */
  .tutores-section,
  .alumnes-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--card-shadow);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .section-header h3 {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  /* === SELECTED TUTOR INFO === */
  .selected-tutor-info {
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .tutor-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .tutor-header h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--primary-700);
    margin: 0;
  }

  .tutor-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--primary-600);
  }

  /* === TUTORES GRID === */
  .tutores-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .tutor-card {
    background: var(--google-grey-50);
    border: 1px solid var(--google-grey-200);
    border-radius: var(--radius-md);
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .tutor-card:hover {
    background: var(--google-grey-100);
    transform: translateY(-1px);
  }

  .tutor-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tutor-email {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--fg);
  }

  .tutor-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--fg-secondary);
  }

  /* === ALUMNES GRID === */
  .alumnes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .alumne-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.2s ease;
  }

  .alumne-card:hover {
    box-shadow: var(--card-shadow-hover);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .alumne-name {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  .alumne-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--fg-secondary);
  }

  .email-link {
    color: var(--primary-600);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .email-link:hover {
    color: var(--primary-700);
    text-decoration: underline;
  }

  /* === CARD ACTIONS === */
  .card-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    margin-top: auto;
  }

  /* === BADGES === */
  .badge {
    font-size: var(--text-xs);
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    border: 1px solid;
  }

  .badge-primary {
    color: var(--primary-600);
    background: var(--primary-50);
    border-color: var(--primary-200);
  }

  .badge-success {
    color: var(--success-600);
    background: var(--success-50);
    border-color: var(--success-200);
  }

  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: stretch;
    }

    .tutor-selector {
      min-width: auto;
      width: 100%;
    }

    .tutores-grid,
    .alumnes-grid {
      grid-template-columns: 1fr;
    }

    .card-actions {
      justify-content: stretch;
    }

    .card-actions .btn {
      flex: 1;
    }
  }
</style>
