<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCursos, eliminarTodosLosCursos, obtenerEstadisticasCurso, type EstadisticasCurso } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';

  let cursos: Array<{ any: string; grups: any[] }> = [];
  let estadisticas: EstadisticasCurso | null = null;
  let cursoSeleccionado = '';
  let loading = true;
  let cargandoEstadisticas = false;
  let error: string | null = null;
  let eliminando = false;

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
        await cargarEstadisticas();
      }
    } catch (e: any) {
      error = e?.message || 'Error carregant cursos';
    } finally {
      loading = false;
    }
  }

  async function cargarEstadisticas() {
    if (!cursoSeleccionado) return;
    
    cargandoEstadisticas = true;
    try {
      estadisticas = await obtenerEstadisticasCurso(cursoSeleccionado);
    } catch (e: any) {
      error = e?.message || 'Error carregant estadístiques';
    } finally {
      cargandoEstadisticas = false;
    }
  }

  async function eliminarTodos() {
    if (!confirm('Estàs segur que vols eliminar TOTS els cursos i dades relacionades? Aquesta acció no es pot desfer i eliminarà:\n\n- Tots els alumnes\n- Totes les entrevistes\n- Totes les tutorías\n- Tots els grups\n- Tots els cursos')) {
      return;
    }
    
    eliminando = true;
    try {
      await eliminarTodosLosCursos();
      try { toastSuccess('Tots els cursos i dades relacionades han estat eliminats'); } catch {}
      await cargarCursos();
    } catch (e: any) {
      try { toastError(e?.message || 'Error eliminant cursos'); } catch {}
      alert(e?.message || 'Error eliminant cursos');
    } finally { eliminando = false; }
  }

  // Función para formatear fechas de mes
  function formatearMes(mes: string): string {
    const [any, mesNum] = mes.split('-');
    const meses = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
    return `${meses[parseInt(mesNum) - 1]} ${any}`;
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Estadístiques de Cursos</h1>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <select bind:value={cursoSeleccionado} onchange={cargarEstadisticas} style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px;">
      {#each cursos as curso}
        <option value={curso.any}>{curso.any}</option>
      {/each}
    </select>
    <button onclick={eliminarTodos} disabled={eliminando || cursos.length === 0} style="padding:8px 14px; border:1px solid #dc2626; background:#dc2626; color:#fff; border-radius:8px; disabled:opacity:50%;">
      {eliminando ? 'Eliminant...' : 'Eliminar Tots els Cursos'}
    </button>
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
    No hi ha cursos disponibles. Crea un curs per veure estadístiques.
  </div>
{:else if cargandoEstadisticas}
  <div>Carregant estadístiques...</div>
{:else if estadisticas}
  <!-- Estadísticas básicas -->
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#2563eb; margin-bottom:4px;">{estadisticas.estadisticas.totalAlumnes}</div>
      <div style="font-size:14px; color:#6b7280;">Alumnes</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#059669; margin-bottom:4px;">{estadisticas.estadisticas.totalGrups}</div>
      <div style="font-size:14px; color:#6b7280;">Grups</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#7c3aed; margin-bottom:4px;">{estadisticas.estadisticas.totalTutores}</div>
      <div style="font-size:14px; color:#6b7280;">Tutors</div>
    </div>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:24px; font-weight:bold; color:#dc2626; margin-bottom:4px;">{estadisticas.estadisticas.totalEntrevistes}</div>
      <div style="font-size:14px; color:#6b7280;">Entrevistes</div>
    </div>
  </div>

  <!-- Gráficos -->
  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
    <!-- Gráfico de entrevistas por mes -->
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Entrevistes per Mes</h3>
      {#if estadisticas.graficos.entrevistesPorMes.length > 0}
        <div style="display:flex; align-items:end; gap:8px; height:200px; padding:16px 0;">
          {#each estadisticas.graficos.entrevistesPorMes as item}
            {@const maxValue = Math.max(...estadisticas.graficos.entrevistesPorMes.map(i => i.total))}
            {@const height = (item.total / maxValue) * 160}
            <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
              <div style="background:#2563eb; width:100%; height:{height}px; border-radius:4px 4px 0 0; margin-bottom:8px; transition:all 0.3s ease; cursor:pointer;" 
                   title="{item.total} entrevistes">
              </div>
              <div style="font-size:12px; color:#6b7280; text-align:center; transform:rotate(-45deg); transform-origin:center; white-space:nowrap;">
                {formatearMes(item.mes)}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div style="text-align:center; color:#6b7280; padding:40px;">No hi ha dades d'entrevistes</div>
      {/if}
    </div>

    <!-- Gráfico de entrevistas por grupo -->
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Entrevistes per Grup</h3>
      {#if estadisticas.graficos.entrevistesPorGrupo.length > 0}
        <div style="display:flex; flex-direction:column; gap:8px;">
          {#each estadisticas.graficos.entrevistesPorGrupo as item}
            {@const maxValue = Math.max(...estadisticas.graficos.entrevistesPorGrupo.map(i => i.total_entrevistes))}
            {@const width = (item.total_entrevistes / maxValue) * 100}
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:12px; color:#374151; min-width:60px;">{item.grup_nom}</div>
              <div style="flex:1; background:#f3f4f6; border-radius:4px; height:20px; overflow:hidden;">
                <div style="background:#059669; height:100%; width:{width}%; border-radius:4px; transition:all 0.3s ease; cursor:pointer;" 
                     title="{item.total_entrevistes} entrevistes">
                </div>
              </div>
              <div style="font-size:12px; color:#6b7280; min-width:30px; text-align:right;">{item.total_entrevistes}</div>
            </div>
          {/each}
        </div>
      {:else}
        <div style="text-align:center; color:#6b7280; padding:40px;">No hi ha dades d'entrevistes per grup</div>
      {/if}
    </div>
  </div>

  <!-- Gráfico de alumnos por grupo -->
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
    <h3 style="margin:0 0 16px 0; font-size:18px; color:#1e293b;">Alumnes per Grup</h3>
    {#if estadisticas.graficos.alumnesPorGrupo.length > 0}
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
        {#each estadisticas.graficos.alumnesPorGrupo as item}
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; transition:all 0.3s ease; cursor:pointer;">
            <div style="font-size:20px; font-weight:bold; color:#7c3aed; margin-bottom:4px;">{item.total_alumnes}</div>
            <div style="font-size:12px; color:#6b7280;">{item.grup_nom}</div>
          </div>
        {/each}
      </div>
    {:else}
      <div style="text-align:center; color:#6b7280; padding:40px;">No hi ha dades d'alumnes per grup</div>
    {/if}
  </div>
{/if}
