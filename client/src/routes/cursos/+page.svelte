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

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Cursos</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
    {#each Array(4) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if cursos.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
        <path d="M12 3L2 8l10 5 10-5-10-5Z" fill="currentColor"/>
      </svg>
      <div style="font-weight:600;">Sense cursos</div>
      <div style="font-size:14px;">Revisa la configuració o importa dades a la BD.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
      {#each cursos as c}
        <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06); display:flex; flex-direction:column; gap:8px;">
          <strong style="font-size:14px; color:#111827;">{c.any}</strong>
          <div style="font-size:13px; color:#111827;">Grups: <span style="color:#374151;">{c.grups?.join(', ') || '—'}</span></div>
        </article>
      {/each}
    </div>
  {/if}
{/if}
