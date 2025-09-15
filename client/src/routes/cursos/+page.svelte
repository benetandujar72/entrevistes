<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCursos, type Curs } from '$lib';

  let cursos: Curs[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      cursos = await fetchCursos();
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });
</script>

<h1>Cursos</h1>

{#if loading}
  <p>Carregant...</p>
{:else if error}
  <p style="color:#b91c1c">{error}</p>
{:else}
  {#if cursos.length === 0}
    <p>No hi ha cursos.</p>
  {:else}
    <div style="display:grid; gap:12px;">
      {#each cursos as c}
        <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
          <strong>{c.any}</strong>
          <div>Grups: {c.grups?.join(', ')}</div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
