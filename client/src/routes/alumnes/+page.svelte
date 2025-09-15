<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnes, type Alumne } from '$lib';

  let alumnes: Alumne[] = [];
  let q = '';
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      alumnes = await fetchAlumnes();
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });

  $: filtered = alumnes.filter(a => a.nom.toLowerCase().includes(q.toLowerCase()));
</script>

<h1>Alumnes</h1>

<input placeholder="Cercar..." bind:value={q} style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; width:100%; max-width:360px;" />

{#if loading}
  <p>Carregant...</p>
{:else if error}
  <p style="color:#b91c1c">{error}</p>
{:else}
  {#if filtered.length === 0}
    <p>No hi ha alumnes.</p>
  {:else}
    <ul style="margin-top:12px; display:grid; gap:8px;">
      {#each filtered as a}
        <li style="padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
          <strong>{a.nom}</strong>
          <div>Grup: {a.grup} · Curs: {a.anyCurs} · Estat: {a.estat}</div>
        </li>
      {/each}
    </ul>
  {/if}
{/if}


