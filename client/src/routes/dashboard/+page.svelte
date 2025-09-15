<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnes, fetchHealth, type Alumne } from '$lib';

  let health = '';
  let total = 0;
  let actius = 0;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      const [h, alumnes] = await Promise.all([fetchHealth(), fetchAlumnes()]);
      health = h.status;
      total = alumnes.length;
      actius = alumnes.filter(a => a.estat === 'alta').length;
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });
</script>

<h1>Dashboard</h1>

{#if loading}
  <p>Carregant...</p>
{:else if error}
  <p style="color:#b91c1c">{error}</p>
{:else}
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
    <div style="border:1px solid #e5e7eb; border-radius:12px; padding:16px;">
      <strong>API</strong>
      <div>health: {health}</div>
    </div>
    <div style="border:1px solid #e5e7eb; border-radius:12px; padding:16px;">
      <strong>Alumnes</strong>
      <div>Total: {total}</div>
      <div>Actius: {actius}</div>
    </div>
  </div>
{/if}


