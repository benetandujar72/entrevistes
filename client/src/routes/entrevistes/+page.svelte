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
  let selectedGrup: string = '';
  let cfg = loadConfigSpreadsheets();
  let isAdmin = false;
  let totalEntrevistas = 0;
  let currentPage = 0;
  let hasMore = false;
  const pageSize = 50;

  // Estado para controlar el popover visible
  let hoveredEntry: string | null = null;

  function showPopover(entrevistaId: string, index: number) {
    hoveredEntry = `${entrevistaId}-${index}`;
  }

  function hidePopover() {
    hoveredEntry = null;
  }

  function isPopoverVisible(entrevistaId: string, index: number): boolean {
    return hoveredEntry === `${entrevistaId}-${index}`;
  }

  type ConsolidatedEntry = {
    dataLine: string;
    dataLabel: string;
    paragraphs: string[];
    snippet: string;
  };

  function getConsolidatedEntries(acords: string): ConsolidatedEntry[] {
    if (!acords) return [];

    return acords
      .split(/---+/g)
      .map((entry) => entry.replace(/\r/g, '').trim())
      .filter((entry) => entry.length > 0)
      .map((entry, entryIndex) => {
        const lines = entry
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const dataLine = lines.find((line) => /^Data:/i.test(line)) ?? '';
        const dataLabel = dataLine.replace(/^Data:\s*/i, '').trim() || `Entrevista ${entryIndex + 1}`;

        const acordsIndex = lines.findIndex((line) => /^Acords:/i.test(line));
        let paragraphs: string[] = [];

        if (acordsIndex !== -1) {
          const firstLine = lines[acordsIndex].replace(/^Acords:\s*/i, '').trim();
          paragraphs = [firstLine, ...lines.slice(acordsIndex + 1)];
        } else {
          paragraphs = lines.filter((line) => !/^Data:/i.test(line));
        }

        const cleanParagraphs = paragraphs
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const finalParagraphs = cleanParagraphs.length > 0 ? cleanParagraphs : ['Sense acords registrats'];
        const plainText = finalParagraphs.join(' ');
        const snippet = plainText.length > 160 ? `${plainText.slice(0, 160).trim()}…` : plainText;

        return {
          dataLine: dataLine || dataLabel,
          dataLabel,
          paragraphs: finalParagraphs,
          snippet
        };
      });
  }

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

    // Filtrar por búsqueda de texto
    const matchesSearch = acords.includes(searchText) || alumneNom.includes(searchText) || alumneId.includes(searchText);

    // Filtrar por grupo si está seleccionado
    const matchesGrup = !selectedGrup || ('alumneGrup' in e && e.alumneGrup === selectedGrup);

    return matchesSearch && matchesGrup;
  });

  // Obtener grupos únicos de las entrevistas cargadas
  $: grupsDisponibles = Array.from(
    new Set(
      entrevistes
        .filter(e => 'alumneGrup' in e && e.alumneGrup)
        .map(e => 'alumneGrup' in e ? e.alumneGrup : null)
        .filter(Boolean)
    )
  ).sort() as string[];
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
        selectedGrup = ''; // Resetear grupo al cambiar curso
        setSelectedCourse(value as any);
        reload();
      }
    },
    grup: {
      value: selectedGrup,
      options: [
        { value: "", label: "Tots els grups" },
        ...grupsDisponibles.map(g => ({ value: g, label: g }))
      ],
      onChange: (value) => {
        selectedGrup = value;
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
              {#if 'alumneGrup' in e && e.alumneGrup}
                <span class="badge badge-info">{e.alumneGrup}</span>
              {/if}
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
            <div class="consolidated-dates">
              {#each getConsolidatedEntries(e.acords) as entry, entryIndex}
                {@const isVisible = isPopoverVisible(e.id, entryIndex)}

                <div class="date-item"
                     onmouseenter={() => showPopover(e.id, entryIndex)}
                     onmouseleave={hidePopover}>
                  <a href="/alumnes/{e.alumneId}#historial" class="date-badge">
                    <Icon name="calendar" size={12} />
                    <span>{entry.dataLabel}</span>
                  </a>

                  <div class="date-snippet">
                    <p>{entry.snippet}</p>
                  </div>

                  {#if isVisible}
                    <div class="popover">
                      <div class="popover-arrow"></div>
                      <div class="popover-content">
                        <strong>{entry.dataLine || 'Sense data registrada'}</strong>
                        {#each entry.paragraphs as paragraph}
                          <p>{paragraph}</p>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
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

  .badge-info {
    color: #0284c7;
    background: #e0f2fe;
    border-color: #bae6fd;
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

  /* Consolidated dates with popover */
  .consolidated-dates {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .date-item {
    position: relative;
    display: inline-block;
  }

  .date-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    text-decoration: none;
  }

  .date-badge:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }

  .acords-text {
    margin-top: 8px;
    color: #374151;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  /* Popover */
  .popover {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    padding: 12px 16px;
    min-width: 250px;
    max-width: 400px;
    z-index: 1000;
    animation: popoverFadeIn 0.2s ease-out;
  }

  .popover-arrow {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: white;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }

  .popover-content {
    position: relative;
    z-index: 1;
  }

  .popover-content strong {
    display: block;
    color: #92400e;
    margin-bottom: 6px;
    font-size: 0.9rem;
  }

  .popover-content p {
    margin: 0;
    color: #374151;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .popover-content .no-content {
    color: #9ca3af;
    font-style: italic;
  }

  @keyframes popoverFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }
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
