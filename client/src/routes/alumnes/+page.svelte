<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnesDb, type Alumne, loadConfigSpreadsheets, setSelectedCourse, getSelectedCourse } from '$lib';
  import TextField from '$lib/components/TextField.svelte';
  import Button from '$lib/components/Button.svelte';

  let alumnes: Alumne[] = [];
  let q = '';
  let grup = '';
  let loading = true;
  let error: string | null = null;

  let selected: string | undefined = undefined;
  let cfg = loadConfigSpreadsheets();
  let anyCurs = '';

  onMount(async () => { selected = getSelectedCourse(); await load(); });
  async function load() {
    try {
      loading = true; error = null;
      const params = anyCurs ? { anyCurs } : undefined;
      alumnes = await fetchAlumnesDb(params);
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  }

  $: filtered = alumnes
    .filter(a => a.nom.toLowerCase().includes(q.toLowerCase()))
    .filter(a => !grup || (a.grup || '').toLowerCase() === grup.toLowerCase())
    .filter(a => {
      if (!selected) return true;
      // Mapear curso a prefijo de grupo
      const cursoPrefix = {
        '1r': '1',
        '2n': '2', 
        '3r': '3',
        '4t': '4'
      }[selected];
      return cursoPrefix ? (a.grup || '').startsWith(cursoPrefix) : true;
    });
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Alumnes {#if !loading}<span style="font-size:14px; color:#6b7280;">({alumnes.length})</span>{/if}</h1>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <div style="min-width:140px;">
      <TextField label="Any" bind:value={anyCurs} placeholder="2025-2026" />
    </div>
    <div>
      <label for="nivell" style="font-size:12px; color:#6b7280;">Curs</label>
      <select id="nivell" bind:value={selected} onchange={() => { setSelectedCourse(selected as any); load(); }} style="display:block; padding:10px 12px; border:1px solid var(--border); border-radius:10px; min-width:140px; background: var(--input-bg); color: var(--fg);">
        <option value="">(sense selecció)</option>
        <option value="1r">1r ESO</option>
        <option value="2n">2n ESO</option>
        <option value="3r">3r ESO</option>
        <option value="4t">4t ESO</option>
      </select>
    </div>
    <div style="min-width:120px;">
      <TextField label="Grup" bind:value={grup} placeholder="Ex: 1A, 1B, 2C..." />
    </div>
    <div style="min-width:220px;">
      <TextField label="Cercar" bind:value={q} placeholder="Nom de l'alumne..." />
    </div>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
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
        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M6 9h8M6 13h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div style="font-weight:600;">Sense alumnes</div>
      <div style="font-size:14px;">Tria un curs o revisa la configuració d'IDs a Config.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
      {#each filtered as a}
        <article style="border:1px solid var(--border); background:var(--card-bg); border-radius:16px; padding:16px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:8px;">
          <strong style="font-size:14px; color:#111827;">{a.nom}</strong>
          <div style="font-size:13px; color:#111827;">Grup: <span style="color:#374151;">{a.grup || '—'}</span></div>
          <div style="font-size:13px; color:#111827;">Curs: <span style="color:#374151;">{a.anyCurs || '—'}</span> · Estat: <span style="color:#374151;">{a.estat || '—'}</span></div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <a class="btn btn-filled-primary btn-sm" href={`/alumnes/${a.id}`}>Obrir fitxa</a>
            <a class="btn btn-tonal-primary btn-sm" href={`/entrevistes/nova?alumne=${a.id}&nom=${encodeURIComponent(a.nom)}&grup=${encodeURIComponent(a.grup || '')}&curs=${encodeURIComponent(a.anyCurs || '')}`}>Nova entrevista</a>
          </div>
        </article>
      {/each}
    </div>
  {/if}
{/if}


