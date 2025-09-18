<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchEntrevistes, type Entrevista, loadConfigSpreadsheets, setSelectedCourse, getSelectedCourse } from '$lib';
  let entrevistes: Entrevista[] = [];
  let q = '';
  let loading = true;
  let error: string | null = null;
  let selected: string | undefined = undefined;
  let cfg = loadConfigSpreadsheets();

  onMount(async () => {
    selected = getSelectedCourse();
    try {
      entrevistes = await fetchEntrevistes();
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });

  async function reload() {
    loading = true; error = null;
    try { entrevistes = await fetchEntrevistes(); }
    catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  $: filtered = entrevistes.filter(e => (e.acords ?? '').toLowerCase().includes(q.toLowerCase()));
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Entrevistes</h1>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <div>
      <label style="font-size:12px; color:#6b7280;">Curs</label>
      <select bind:value={selected} onchange={() => { setSelectedCourse(selected as any); reload(); }} style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:140px;">
        <option value="">(sense selecció)</option>
        <option value="1r">1r ESO</option>
        <option value="2n">2n ESO</option>
        <option value="3r">3r ESO</option>
        <option value="4t">4t ESO</option>
      </select>
    </div>
    <div>
      <label style="font-size:12px; color:#6b7280;">Filtrar</label>
      <input placeholder="Cercar per acords..." bind:value={q} style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:220px;" />
    </div>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <!-- Skeleton grid -->
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
    {#each Array(6) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px; margin-bottom:6px;"></div>
        <div style="height:10px; width:50%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if filtered.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
        <rect x="4" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 8h10M7 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div style="font-weight:600;">Sense entrevistes</div>
      <div style="font-size:14px;">Tria un curs al selector o revisa la configuració d'IDs a Config.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
      {#each filtered as e}
        <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <strong style="font-size:14px; color:#111827;">{e.data || '—'}</strong>
            <span style="font-size:12px; color:#2563eb; background:#eff6ff; border:1px solid #dbeafe; padding:2px 8px; border-radius:999px;">{e.anyCurs || selected || '—'}</span>
          </div>
          <div style="font-size:13px; color:#111827;">Alumne: <span style="color:#374151;">{e.alumneId || '—'}</span></div>
          <div style="font-size:13px; color:#374151; line-height:1.4;">{e.acords || 'Sense acords'}</div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
            <a href="#" style="font-size:12px; padding:6px 10px; border:1px solid #e5e7eb; border-radius:10px; text-decoration:none; color:#111827;">Veure</a>
            <a href="#" style="font-size:12px; padding:6px 10px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:10px; text-decoration:none;">Editar</a>
          </div>
        </article>
      {/each}
    </div>
  {/if}
{/if}


