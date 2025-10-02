<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchEntrevistes, fetchTodasLasEntrevistasAdmin, type Entrevista, type EntrevistaAdmin, loadConfigSpreadsheets, setSelectedCourse, getSelectedCourse, formatearFechaMadridSoloFecha, deleteEntrevista } from '$lib';
  import { getToken } from '$lib/auth';
  import Icon from '$lib/components/SimpleIcon.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  
  let entrevistes: (Entrevista | EntrevistaAdmin)[] = [];
  let q = '';
  let loading = true;
  let error: string | null = null;
  let selected: string | undefined = undefined;
  let cfg = loadConfigSpreadsheets();
  let isAdmin = false;
  let totalEntrevistas = 0;
  let currentPage = 0;
  let hasMore = false;
  const pageSize = 50;

  onMount(async () => {
    const savedCourse = getSelectedCourse();
    // Si hay un curso guardado, usarlo; si no, usar el primer curso por defecto
    selected = savedCourse || '1r';
    // Si no había curso guardado, guardarlo ahora
    if (!savedCourse) {
      setSelectedCourse('1r' as any);
    }
    // Detectar si es administrador (simplificado: si tiene token, asumimos que puede ser admin)
    isAdmin = !!getToken();
    await loadEntrevistas();
  });

  async function loadEntrevistas() {
    loading = true; 
    error = null;
    console.log('🔄 Cargando entrevistas para curso:', selected);
    try { 
      if (isAdmin) {
        // Para administradores: cargar todas las entrevistas (normales + consolidadas)
        // Asegurar que siempre se pasa un curso (usar '1r' por defecto si no hay selected)
        const cursoActual = selected || '1r';
        console.log('📚 Llamando fetchTodasLasEntrevistasAdmin con curso:', cursoActual);
        const response = await fetchTodasLasEntrevistasAdmin(cursoActual, pageSize, currentPage * pageSize);
        entrevistes = response.entrevistas;
        totalEntrevistas = response.paginacion.total;
        hasMore = response.paginacion.hasMore;
        console.log('✅ Entrevistas cargadas:', entrevistes.length);
      } else {
        // Para usuarios normales: usar el endpoint tradicional
        entrevistes = await fetchEntrevistes();
        totalEntrevistas = entrevistes.length;
        hasMore = false;
      }
    } catch (e: any) { 
      console.error('❌ Error cargando entrevistas:', e);
      error = e?.message ?? 'Error'; 
    } finally { 
      loading = false; 
    }
  }

  async function reload() {
    currentPage = 0;
    await loadEntrevistas();
  }

  async function loadMore() {
    if (!hasMore || loading) return;
    currentPage++;
    loading = true;
    try {
      const cursoActual = selected || '1r';
      const response = await fetchTodasLasEntrevistasAdmin(cursoActual, pageSize, currentPage * pageSize);
      entrevistes = [...entrevistes, ...response.entrevistas];
      hasMore = response.paginacion.hasMore;
    } catch (e: any) {
      error = e?.message ?? 'Error cargando más entrevistas';
    } finally {
      loading = false;
    }
  }

  async function borrarEntrevista(entrevistaId: string, fecha: string) {
    if (!confirm(`Estàs segur que vols borrar l'entrevista del ${formatearFechaMadridSoloFecha(fecha)}?`)) {
      return;
    }

    try {
      await deleteEntrevista(entrevistaId);
      // Recargar las entrevistas después de borrar
      await loadEntrevistas();
    } catch (e: any) {
      alert('Error borrant l\'entrevista: ' + (e?.message ?? 'Error desconegut'));
    }
  }

  $: filtered = entrevistes.filter(e => {
    const searchText = q.toLowerCase();
    const acords = (e.acords ?? '').toLowerCase();
    const alumneNom = ('alumneNom' in e ? e.alumneNom : '')?.toLowerCase() || '';
    const alumneId = (e.alumneId ?? '').toLowerCase();
    return acords.includes(searchText) || alumneNom.includes(searchText) || alumneId.includes(searchText);
  });
</script>

<FilterBar 
  title="Entrevistes"
  count={totalEntrevistas}
  {loading}
  filters={{
    curs: { 
      value: selected, 
      options: [
        { value: "1r", label: "1r ESO" },
        { value: "2n", label: "2n ESO" },
        { value: "3r", label: "3r ESO" },
        { value: "4t", label: "4t ESO" }
      ],
      onChange: (value) => { 
        selected = value as any;
        setSelectedCourse(value as any); 
        reload(); 
      }
    },
    search: { 
      value: q, 
      placeholder: "Cercar per acords, alumne...",
      onChange: (value) => { q = value; }
    }
  }}
/>

{#if isAdmin}
  <div class="admin-badge">
    <Icon name="user" size={14} />
    <span>Vista Administrador - {totalEntrevistas} entrevistas total</span>
  </div>
{/if}

{#if loading}
  <!-- Skeleton grid -->
  <div class="skeleton-grid">
    {#each Array(6) as _}
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-content"></div>
        <div class="skeleton-line skeleton-content-short"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div class="error-card">
    <Icon name="alert-circle" size={18} />
    <span>{error}</span>
  </div>
{:else}
  {#if filtered.length === 0}
    <div class="empty-state">
      <Icon name="notes" size={36} />
      <div class="empty-title">Sense entrevistes</div>
      <div class="empty-subtitle">Tria un curs al selector o revisa la configuració d'IDs a Config.</div>
    </div>
  {:else}
    <div class="entrevistas-grid">
      {#each filtered as e}
        <article class="entrevista-card">
          <div class="card-header">
            <div class="entrevista-date">
              <Icon name="calendar" size={16} />
              <span>{formatearFechaMadridSoloFecha(e.data) || '—'}</span>
            </div>
            <div class="card-badges">
              <span class="badge badge-primary">{e.anyCurs || selected || '—'}</span>
              {#if 'tipo' in e}
                <span class="badge {e.tipo === 'normal' ? 'badge-success' : 'badge-purple'}">
                  {e.tipo === 'normal' ? 'Actual' : 'Històric'}
                </span>
              {/if}
            </div>
          </div>
          
          <div class="entrevista-student">
            <Icon name="user" size={14} />
            <span>Alumne: {('alumneNom' in e ? e.alumneNom : '') || e.alumneId || '—'}</span>
          </div>
          
          {#if 'origen' in e && e.origen !== 'Sistema actual'}
            <div class="entrevista-origin">
              <Icon name="tag" size={12} />
              <span>Origen: {e.origen}</span>
            </div>
          {/if}
          
          {#if 'tipo' in e && e.tipo === 'consolidada' && e.acords}
            <!-- Para entrevistas consolidadas, parsear múltiples entradas -->
            {#each e.acords.split('---').map(entry => entry.trim()).filter(entry => entry) as entry, index}
              {@const parts = entry.split('\n').filter(part => part.trim())}
              {@const dataLine = parts.find(part => part.startsWith('Data:'))}
              {@const acordsLine = parts.find(part => part.startsWith('Acords:'))}
              
              <div class="consolidada-entry">
                {#if dataLine}
                  <div class="consolidada-date">
                    <Icon name="calendar" size={12} />
                    <span>{dataLine}</span>
                  </div>
                {/if}
                {#if acordsLine}
                  <div class="consolidada-content">
                    <span>{acordsLine}</span>
                  </div>
                {/if}
              </div>
            {/each}
          {:else}
            <!-- Para entrevistas normales, mostrar acords directamente -->
            <div class="entrevista-content">
              <span>{e.acords || 'Sense acords'}</span>
            </div>
          {/if}
          
          <div class="card-actions">
            <a href="/alumnes/{e.alumneId}" class="btn btn-text-primary btn-sm">
              <Icon name="user" size={14} />
              Veure alumne
            </a>
            {#if 'tipo' in e && e.tipo === 'normal'}
              <a href={`/entrevistes/editar/${e.id}`} class="btn btn-filled-primary btn-sm">
                <Icon name="edit" size={14} />
                Editar
              </a>
              <button 
                onclick={() => borrarEntrevista(e.id, e.data)}
                class="btn btn-danger btn-sm"
              >
                <Icon name="trash" size={14} />
                Borrar
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
    
    {#if isAdmin && hasMore}
      <div class="load-more">
        <button 
          onclick={loadMore} 
          disabled={loading}
          class="btn btn-filled-primary"
        >
          {#if loading}
            <span class="btn-spinner"></span>
          {:else}
            <Icon name="plus" size={16} />
          {/if}
          {loading ? 'Carregant...' : 'Carregar més entrevistes'}
        </button>
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
    margin-bottom: 1.5rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0 0 0.5rem 0;
  }

  .admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--success-600);
    background: var(--success-50);
    border: 1px solid var(--success-200);
    padding: 0.5rem 1rem;
    border-radius: 999px;
    font-weight: 500;
  }

  /* === FILTERS === */
  .filters {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: end;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
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
    min-width: 140px;
  }

  .select:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .search-input {
    position: relative;
  }

  .input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--input-bg);
    color: var(--fg);
    transition: all 0.2s ease;
    min-width: 220px;
  }

  .input:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--google-grey-400);
    pointer-events: none;
  }

  /* === SKELETON LOADING === */
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .skeleton-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    box-shadow: var(--card-shadow);
  }

  .skeleton-line {
    background: var(--google-grey-200);
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-title {
    height: 1rem;
    width: 60%;
  }

  .skeleton-content {
    height: 0.75rem;
    width: 80%;
  }

  .skeleton-content-short {
    height: 0.75rem;
    width: 50%;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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

  /* === ENTREVISTAS GRID === */
  .entrevistas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  /* === ENTREVISTA CARD === */
  .entrevista-card {
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

  .entrevista-card:hover {
    box-shadow: var(--card-shadow-hover);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .entrevista-date {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: var(--text-sm);
    color: var(--fg);
  }

  .card-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

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

  .badge-purple {
    color: #7c3aed;
    background: #f3e8ff;
    border-color: #e9d5ff;
  }

  .entrevista-student {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    color: var(--fg);
  }

  .entrevista-origin {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-xs);
    color: var(--fg-secondary);
  }

  .entrevista-content {
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    line-height: 1.5;
  }

  .consolidada-entry {
    margin-bottom: 1rem;
  }

  .consolidada-date {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--warning-50);
    border: 1px solid var(--warning-500);
    border-radius: var(--radius-md);
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--warning-600);
  }

  .consolidada-content {
    background: var(--google-grey-100);
    border: 1px solid var(--google-grey-300);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    line-height: 1.4;
  }

  /* === CARD ACTIONS === */
  .card-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    margin-top: auto;
  }

  /* === LOAD MORE === */
  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-group {
      width: 100%;
    }

    .input, .select {
      min-width: auto;
      width: 100%;
    }

    .entrevistas-grid {
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
