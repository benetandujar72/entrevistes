<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fetchEntrevista, updateEntrevista, formatearFechaMadridSoloFecha } from '$lib';
  
  let id: string = '';
  let entrevista: any = null;
  let alumneData: any = null;
  let dataEntrevista: string = '';
  let acordsEntrevista: string = '';
  let loading = false;
  let error: string | null = null;
  let success = false;

  onMount(async () => {
    id = $page.params.id || '';
    await cargarEntrevista();
  });

  async function cargarEntrevista() {
    try {
      loading = true;
      error = null;
      
      // Cargar datos de la entrevista
      entrevista = await fetchEntrevista(id);
      
      if (entrevista) {
        // Formatear la fecha para el input date (YYYY-MM-DD)
        const fecha = new Date(entrevista.data);
        dataEntrevista = fecha.toISOString().split('T')[0];
        acordsEntrevista = entrevista.acords || '';
        
        // Cargar datos del alumno
        alumneData = {
          nom: entrevista.alumneNom || '',
          grup: entrevista.grup || '',
          curs: entrevista.anyCurs || ''
        };
      }
    } catch (e: any) {
      error = e?.message ?? 'Error carregant l\'entrevista';
    } finally {
      loading = false;
    }
  }

  async function guardarEntrevista() {
    loading = true;
    error = null;
    success = false;
    
    try {
      const entrevistaActualizada = {
        data: dataEntrevista,
        acords: acordsEntrevista
      };
      
      await updateEntrevista(id, entrevistaActualizada);
      success = true;
      
      setTimeout(() => {
        goto(`/alumnes/${entrevista.alumneId}`);
      }, 2000);
      
    } catch (e: any) {
      error = e?.message ?? 'Error guardant l\'entrevista';
    } finally {
      loading = false;
    }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Editar Entrevista</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <div style="padding:20px; text-align:center;">Carregant entrevista...</div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else if success}
  <div style="padding:14px; border:1px solid #d1fae5; background:#ecfdf5; color:#047857; border-radius:12px;">
    <div style="font-weight:600; margin-bottom:8px;">✅ Entrevista actualitzada correctament</div>
    <div style="font-size:14px;">Redirigint a la fitxa de l'alumne...</div>
  </div>
{:else if entrevista}
  <div style="max-width:600px; margin:0 auto;">
    <form onsubmit={(e) => { e.preventDefault(); guardarEntrevista(); }} style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Informació de l'alumne (només lectura) -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
        <h3 style="margin:0 0 12px 0; font-size:16px; color:#1e293b;">Informació de l'alumne</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <label for="alumneNom" style="font-size:12px; color:#6b7280; display:block; margin-bottom:4px;">Nom de l'alumne</label>
            <input id="alumneNom" type="text" value={alumneData?.nom || ''} readonly style="display:block; width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#f3f4f6; color:#4b5563;" />
          </div>
          <div>
            <label for="grup" style="font-size:12px; color:#6b7280; display:block; margin-bottom:4px;">Grup</label>
            <input id="grup" type="text" value={alumneData?.grup || ''} readonly style="display:block; width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#f3f4f6; color:#4b5563;" />
          </div>
          <div>
            <label for="curs" style="font-size:12px; color:#6b7280; display:block; margin-bottom:4px;">Curs</label>
            <input id="curs" type="text" value={alumneData?.curs || ''} readonly style="display:block; width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#f3f4f6; color:#4b5563;" />
          </div>
        </div>
      </div>

      <!-- Dades de l'entrevista -->
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
        <h3 style="margin:0 0 12px 0; font-size:16px; color:#1e293b;">Dades de l'entrevista</h3>
        
        <div>
          <label for="data" style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">Data de l'entrevista *</label>
          <input 
            id="data" 
            type="date" 
            bind:value={dataEntrevista} 
            required
            style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;" 
          />
          <div style="font-size:11px; color:#6b7280; margin-top:4px;">
            Data seleccionada: {dataEntrevista || 'No seleccionada'}
          </div>
        </div>

        <div style="margin-top:16px;">
          <label for="acords" style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">Acords de l'entrevista *</label>
          <textarea 
            id="acords" 
            bind:value={acordsEntrevista} 
            rows="8" 
            required
            style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; resize:vertical;" 
            placeholder="Escriu els acords de l'entrevista..."
          ></textarea>
        </div>
      </div>

      <!-- Botons d'acció -->
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button 
          type="button" 
          onclick={() => goto(`/alumnes/${entrevista.alumneId}`)}
          style="padding:12px 24px; background:#6b7280; color:#fff; border:none; border-radius:10px; font-size:14px; cursor:pointer;"
        >
          Cancel·lar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          style="padding:12px 24px; background:#2563eb; color:#fff; border:none; border-radius:10px; font-size:14px; cursor:pointer; disabled:opacity:50%;"
        >
          {loading ? 'Guardant...' : 'Guardar Canvis'}
        </button>
      </div>
    </form>
  </div>
{/if}
