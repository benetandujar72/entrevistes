<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fetchEntrevistes, type Entrevista } from '$lib';
  import { getToken } from '$lib/auth';
  let id = '';
  let anyCurs = '';
  let entrevistes: Entrevista[] = [];
  let loading = true;
  let error: string | null = null;
  let canAdd = false;

  onMount(async () => {
    id = $page.params.id;
    try {
      loading = true; error = null;
      const all = await fetchEntrevistes();
      entrevistes = all.filter(e => e.alumneId === id);
      // Permiso simple: si hay token, permitir añadir. El backend validará rol/tutoría
      canAdd = !!getToken();
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally { loading = false; }
  });
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Fitxa alumne</h1>
  {#if canAdd}
  <a href="/entrevistes" style="font-size:12px; padding:8px 12px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:10px; text-decoration:none;">Afegir entrevista</a>
  {/if}
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <div>Carregant…</div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if entrevistes.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">Sense entrevistes</div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
      {#each entrevistes as e}
        <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <strong style="font-size:14px; color:#111827;">{e.data || '—'}</strong>
            <span style="font-size:12px; color:#2563eb; background:#eff6ff; border:1px solid #dbeafe; padding:2px 8px; border-radius:999px;">{e.anyCurs || '—'}</span>
          </div>
          <div style="font-size:13px; color:#374151; line-height:1.4;">{e.acords || '—'}</div>
        </article>
      {/each}
    </div>
  {/if}
{/if}
