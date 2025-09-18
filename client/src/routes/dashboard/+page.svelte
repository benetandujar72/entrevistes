<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnesDb, fetchHealth, type Alumne } from '$lib';

  let health = '';
  let total = 0;
  let actius = 0;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      const [h, alumnes] = await Promise.all([fetchHealth(), fetchAlumnesDb()]);
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

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Dashboard</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
    {#each Array(3) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
    <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06);">
      <div style="font-size:12px; color:#64748b;">API</div>
      <div style="font-weight:700; color:#111827; font-size:18px;">{health}</div>
    </article>
    <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06);">
      <div style="font-size:12px; color:#64748b;">Alumnes</div>
      <div style="font-weight:700; color:#111827; font-size:18px;">{total}</div>
    </article>
    <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06);">
      <div style="font-size:12px; color:#64748b;">Actius</div>
      <div style="font-weight:700; color:#111827; font-size:18px;">{actius}</div>
    </article>
  </div>
{/if}


