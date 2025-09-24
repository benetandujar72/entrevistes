<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchEntrevistes, fetchTodasLasEntrevistasAdmin, type Entrevista, type EntrevistaAdmin, loadConfigSpreadsheets, setSelectedCourse, getSelectedCourse, formatearFechaMadridSoloFecha, deleteEntrevista } from '$lib';
  import { getToken } from '$lib/auth';
  
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
    selected = getSelectedCourse();
    // Detectar si es administrador (simplificado: si tiene token, asumimos que puede ser admin)
    isAdmin = !!getToken();
    await loadEntrevistas();
  });

  async function loadEntrevistas() {
    loading = true; 
    error = null;
    try { 
      if (isAdmin) {
        // Para administradores: cargar todas las entrevistas (normales + consolidadas)
        const response = await fetchTodasLasEntrevistasAdmin(selected, pageSize, currentPage * pageSize);
        entrevistes = response.entrevistas;
        totalEntrevistas = response.paginacion.total;
        hasMore = response.paginacion.hasMore;
      } else {
        // Para usuarios normales: usar el endpoint tradicional
        entrevistes = await fetchEntrevistes();
        totalEntrevistas = entrevistes.length;
        hasMore = false;
      }
    } catch (e: any) { 
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
      const response = await fetchTodasLasEntrevistasAdmin(selected, pageSize, currentPage * pageSize);
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

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <div>
    <h1 style="margin:0; font-size:22px;">Entrevistes</h1>
    {#if isAdmin}
      <div style="font-size:12px; color:#059669; margin-top:4px;">
        <span style="background:#ecfdf5; border:1px solid #d1fae5; padding:2px 8px; border-radius:999px;">
          👑 Vista Administrador - {totalEntrevistas} entrevistas total
        </span>
      </div>
    {/if}
  </div>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <div>
      <label style="font-size:12px; color:#6b7280;">Curs</label>
      <select bind:value={selected} onchange={() => { setSelectedCourse(selected as any); reload(); }} style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:140px;">
        <option value="">(tots els cursos)</option>
        <option value="1r">1r ESO</option>
        <option value="2n">2n ESO</option>
        <option value="3r">3r ESO</option>
        <option value="4t">4t ESO</option>
      </select>
    </div>
    <div>
      <label style="font-size:12px; color:#6b7280;">Filtrar</label>
      <input placeholder="Cercar per acords, alumne..." bind:value={q} style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:220px;" />
    </div>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <!-- Skeleton grid -->
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
    {#each Array(6) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px; margin-bottom:6px;"></div>
        <div style="height:10px; width:50%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if filtered.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
        <rect x="4" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 8h10M7 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div style="font-weight:600;">Sense entrevistes</div>
      <div style="font-size:14px;">Tria un curs al selector o revisa la configuració d'IDs a Config.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px;">
      {#each filtered as e}
        <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06); display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <strong style="font-size:14px; color:#111827;">{formatearFechaMadridSoloFecha(e.data) || '—'}</strong>
            <div style="display:flex; gap:4px;">
              <span style="font-size:12px; color:#2563eb; background:#eff6ff; border:1px solid #dbeafe; padding:2px 8px; border-radius:999px;">{e.anyCurs || selected || '—'}</span>
              {#if 'tipo' in e}
                <span style="font-size:12px; color:{e.tipo === 'normal' ? '#059669' : '#7c3aed'}; background:{e.tipo === 'normal' ? '#ecfdf5' : '#f3e8ff'}; border:1px solid {e.tipo === 'normal' ? '#d1fae5' : '#e9d5ff'}; padding:2px 8px; border-radius:999px;">
                  {e.tipo === 'normal' ? 'Actual' : 'Històric'}
                </span>
              {/if}
            </div>
          </div>
              <div style="font-size:13px; color:#111827;">Alumne: <span style="color:#374151;">{('alumneNom' in e ? e.alumneNom : '') || e.alumneId || '—'}</span></div>
              {#if 'origen' in e && e.origen !== 'Sistema actual'}
                <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">
                  Origen: {e.origen}
                </div>
              {/if}
              
              {#if 'tipo' in e && e.tipo === 'consolidada' && e.acords}
                <!-- Para entrevistas consolidadas, parsear múltiples entradas -->
                {#each e.acords.split('---').map(entry => entry.trim()).filter(entry => entry) as entry, index}
                  {@const parts = entry.split('\n').filter(part => part.trim())}
                  {@const dataLine = parts.find(part => part.startsWith('Data:'))}
                  {@const acordsLine = parts.find(part => part.startsWith('Acords:'))}
                  
                  <div style="margin-bottom: {index < e.acords.split('---').length - 1 ? '12px' : '0px'};">
                    {#if dataLine}
                      <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:8px; padding:8px; margin-bottom:6px;">
                        <strong style="font-size:12px; color:#92400e;">{dataLine}</strong>
                      </div>
                    {/if}
                    {#if acordsLine}
                      <div style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:8px; padding:8px;">
                        <div style="font-size:13px; color:#374151; line-height:1.4;">{acordsLine}</div>
                      </div>
                    {/if}
                  </div>
                {/each}
              {:else}
                <!-- Para entrevistas normales, mostrar acords directamente -->
                <div style="font-size:13px; color:#374151; line-height:1.4;">{e.acords || 'Sense acords'}</div>
              {/if}
              
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
                <a href="/alumnes/{e.alumneId}" style="font-size:12px; padding:6px 10px; border:1px solid #e5e7eb; border-radius:10px; text-decoration:none; color:#111827;">Veure alumne</a>
                {#if 'tipo' in e && e.tipo === 'normal'}
                  <a href={`/entrevistes/editar/${e.id}`} style="font-size:12px; padding:6px 10px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:10px; text-decoration:none;">Editar</a>
                  <button 
                    onclick={() => borrarEntrevista(e.id, e.data)}
                    style="font-size:12px; padding:6px 10px; border:1px solid #dc2626; background:#dc2626; color:#fff; border-radius:10px; cursor:pointer;"
                  >
                    Borrar
                  </button>
                {/if}
              </div>
        </article>
      {/each}
    </div>
    
    {#if isAdmin && hasMore}
      <div style="text-align:center; margin-top:20px;">
        <button 
          onclick={loadMore} 
          disabled={loading}
          style="padding:12px 24px; background:#2563eb; color:#fff; border:none; border-radius:10px; font-size:14px; cursor:pointer; disabled:opacity:50%;"
        >
          {loading ? 'Carregant...' : 'Carregar més entrevistes'}
        </button>
      </div>
    {/if}
  {/if}
{/if}


