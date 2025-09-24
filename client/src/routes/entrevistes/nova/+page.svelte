<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getToken } from '$lib/auth';

  let alumneId = '';
  let alumneNom = '';
  let grup = '';
  let curs = '';
  let dataEntrevista = '';
  let acords = '';
  let loading = false;
  let error: string | null = null;
  let success = false;

  onMount(() => {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams($page.url.search);
    alumneId = urlParams.get('alumne') || '';
    alumneNom = urlParams.get('nom') || '';
    grup = urlParams.get('grup') || '';
    curs = urlParams.get('curs') || '';
    
    // Establecer fecha actual como predeterminada
    const today = new Date();
    dataEntrevista = today.toISOString().split('T')[0];
  });

  async function guardarEntrevista() {
    if (!alumneId || !dataEntrevista || !acords.trim()) {
      error = 'Cal omplir tots els camps obligatoris';
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch('http://localhost:8081/entrevistes/nova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          alumneId,
          alumneNom,
          grup,
          curs,
          data: dataEntrevista,
          acords: acords.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error guardant l\'entrevista');
      }

      success = true;
      setTimeout(() => {
        goto(`/alumnes/${alumneId}`);
      }, 2000);

    } catch (e: any) {
      error = e?.message || 'Error guardant l\'entrevista';
    } finally {
      loading = false;
    }
  }

  function cancelar() {
    goto(`/alumnes/${alumneId}`);
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Nova Entrevista</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if success}
  <div style="padding:16px; border:1px solid #d1fae5; background:#ecfdf5; color:#065f46; border-radius:12px; text-align:center;">
    <div style="font-weight:600; margin-bottom:8px;">✅ Entrevista guardada correctament</div>
    <div style="font-size:14px;">Redirigint a la fitxa de l'alumne...</div>
  </div>
{:else}
  <div style="max-width:600px; margin:0 auto;">
      <form onsubmit={(e) => { e.preventDefault(); guardarEntrevista(); }} style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Informació de l'alumne (només lectura) -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
        <h3 style="margin:0 0 12px 0; font-size:16px; color:#1e293b;">Informació de l'alumne</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <label style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">Nom de l'alumne</label>
            <input type="text" bind:value={alumneNom} readonly style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb; color:#6b7280;" />
          </div>
          <div>
            <label style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">Grup</label>
            <input type="text" bind:value={grup} readonly style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb; color:#6b7280;" />
          </div>
        </div>
        <div style="margin-top:12px;">
          <label style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">Curs actual</label>
          <input type="text" bind:value={curs} readonly style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb; color:#6b7280;" />
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
            bind:value={acords} 
            required
            placeholder="Descriviu els acords presos durant l'entrevista..."
            rows="6"
            style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; font-family:inherit; resize:vertical;" 
          ></textarea>
        </div>
      </div>

      <!-- Botons -->
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button 
          type="button" 
          onclick={cancelar}
          disabled={loading}
          style="padding:12px 24px; border:1px solid #d1d5db; background:#ffffff; color:#374151; border-radius:8px; font-size:14px; cursor:pointer; disabled:opacity:50%;"
        >
          Cancel·lar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          style="padding:12px 24px; border:1px solid #059669; background:#059669; color:#ffffff; border-radius:8px; font-size:14px; cursor:pointer; disabled:opacity:50%;"
        >
          {loading ? 'Guardant...' : 'Guardar entrevista'}
        </button>
      </div>
    </form>

    {#if error}
      <div style="margin-top:16px; padding:12px; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:8px; font-size:14px;">
        {error}
      </div>
    {/if}
  </div>
{/if}
