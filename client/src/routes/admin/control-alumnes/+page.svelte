<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCursos, obtenerControlAlumnes, type ControlAlumnes } from '$lib';
  import { toastError } from '$lib/toast';

  let cursos: Array<{ any: string; grups: any[] }> = [];
  let cursoSeleccionado = '';
  let controlData: ControlAlumnes | null = null;
  let loading = true;
  let cargandoControl = false;
  let error: string | null = null;

  onMount(async () => {
    await cargarCursos();
  });

  async function cargarCursos() {
    loading = true;
    error = null;
    try {
      cursos = await fetchCursos();
      if (cursos.length > 0) {
        cursoSeleccionado = cursos[0].any;
        await cargarControl();
      }
    } catch (e: any) {
      error = e?.message || 'Error carregant cursos';
    } finally {
      loading = false;
    }
  }

  async function cargarControl() {
    if (!cursoSeleccionado) return;
    
    cargandoControl = true;
    try {
      controlData = await obtenerControlAlumnes(cursoSeleccionado);
    } catch (e: any) {
      error = e?.message || 'Error carregant control d\'alumnes';
    } finally {
      cargandoControl = false;
    }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Control d'Alumnes</h1>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <select bind:value={cursoSeleccionado} onchange={cargarControl} style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px;">
      {#each cursos as curso}
        <option value={curso.any}>{curso.any}</option>
      {/each}
    </select>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
  {#if error}
    <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
  {/if}
</section>

{#if loading}
  <div>Carregant cursos...</div>
{:else if cursos.length === 0}
  <div style="padding:20px; text-align:center; color:#6b7280;">
    No hi ha cursos disponibles. Crea un curs per veure el control d'alumnes.
  </div>
{:else if cargandoControl}
  <div>Carregant control d'alumnes...</div>
{:else if controlData}
  <!-- Estadísticas generales -->
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#2563eb; margin-bottom:4px;">{controlData.estadisticas.total_alumnes}</div>
      <div style="font-size:14px; color:#6b7280;">Total Alumnes</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#059669; margin-bottom:4px;">{controlData.estadisticas.alumnes_entrevistats}</div>
      <div style="font-size:14px; color:#6b7280;">Entrevistats</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#dc2626; margin-bottom:4px;">{controlData.estadisticas.alumnes_sin_entrevista}</div>
      <div style="font-size:14px; color:#6b7280;">Sense Entrevista</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#7c3aed; margin-bottom:4px;">{controlData.estadisticas.total_entrevistes}</div>
      <div style="font-size:14px; color:#6b7280;">Total Entrevistes</div>
    </div>
  </div>

  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
    <!-- Alumnos con más entrevistas -->
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Alumnes amb Més Entrevistes</h3>
      {#if controlData.masEntrevistas.length > 0}
        <div style="display:flex; flex-direction:column; gap:8px;">
          {#each controlData.masEntrevistas as alumne}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border-radius:8px;">
              <div>
                <div style="font-weight:600; color:#1e293b;">{alumne.nom}</div>
                <div style="font-size:12px; color:#6b7280;">{alumne.grup_nom}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:14px; font-weight:bold; color:#059669;">{alumne.total_entrevistes}</span>
                <a href="/alumnes/{alumne.id}" style="font-size:12px; padding:4px 8px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:4px; text-decoration:none;">Veure</a>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div style="text-align:center; color:#6b7280; padding:20px;">No hi ha alumnes amb entrevistes</div>
      {/if}
    </div>

    <!-- Alumnos sin entrevistas -->
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Alumnes Sense Entrevista</h3>
      {#if controlData.sinEntrevistas.length > 0}
        <div style="display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto;">
          {#each controlData.sinEntrevistas as alumne}
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
              <div>
                <div style="font-weight:600; color:#1e293b;">{alumne.nom}</div>
                <div style="font-size:12px; color:#6b7280;">{alumne.grup_nom}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px; color:#dc2626; background:#fee2e2; padding:2px 6px; border-radius:4px;">⚠️</span>
                <a href="/alumnes/{alumne.id}" style="font-size:12px; padding:4px 8px; border:1px solid #dc2626; background:#dc2626; color:#fff; border-radius:4px; text-decoration:none;">Entrevistar</a>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div style="text-align:center; color:#059669; padding:20px;">✅ Tots els alumnes tenen entrevistes</div>
      {/if}
    </div>
  </div>

  <!-- Alumnos con alertas especiales -->
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
    <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Alumnes amb Atenció Especial</h3>
    {#if controlData.conAlertas.length > 0}
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;">
        {#each controlData.conAlertas as alumne}
          <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:8px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
              <h4 style="margin:0; font-size:16px; color:#92400e;">{alumne.nom}</h4>
              <span style="font-size:12px; color:#92400e; background:#fef3c7; border:1px solid #fbbf24; padding:2px 8px; border-radius:999px;">⚠️ Atenció</span>
            </div>
            <div style="font-size:14px; color:#6b7280; margin-bottom:8px;">
              <div><strong>Grup:</strong> {alumne.grup_nom}</div>
            </div>
            <div style="font-size:13px; color:#92400e; background:#fef3c7; border:1px solid #fbbf24; border-radius:6px; padding:8px; margin-bottom:12px;">
              <strong>Observacions:</strong> {alumne.observacions}
            </div>
            <div style="display:flex; gap:8px;">
              <a href="/alumnes/{alumne.id}" style="font-size:12px; padding:6px 12px; border:1px solid #f59e0b; background:#f59e0b; color:#fff; border-radius:6px; text-decoration:none;">
                Veure Fitxa
              </a>
              <a href="/entrevistes/nova?alumne={alumne.id}&nom={encodeURIComponent(alumne.nom)}&grup={encodeURIComponent(alumne.grup_nom)}&curs={encodeURIComponent(cursoSeleccionado)}" style="font-size:12px; padding:6px 12px; border:1px solid #059669; background:#059669; color:#fff; border-radius:6px; text-decoration:none;">
                Nova Entrevista
              </a>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div style="text-align:center; color:#059669; padding:20px;">✅ No hi ha alumnes amb alertes especials</div>
    {/if}
  </div>
{/if}

