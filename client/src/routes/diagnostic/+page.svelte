<script lang="ts">
  import { onMount } from 'svelte';
  import { authHeaders, loadConfigSpreadsheets, type ConfigSpreadsheets } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';
  let spreadsheetId = '';
  let any = '';
  let data: any = null;
  let error: string | null = null;
  let loading = false;
  let anyCurs = '';
  let suggested: string[] = [];

  let cfg: Partial<ConfigSpreadsheets> = loadConfigSpreadsheets();

  async function run() {
    loading = true; error = null; data = null;
    try {
      const qs = new URLSearchParams({ spreadsheetId }).toString();
      const r = await fetch(`http://localhost:8081/sheets/diagnostic?${qs}`, { headers: authHeaders() });
      const t = await r.text();
      if (!r.ok) throw new Error(t);
      data = JSON.parse(t);
      // Proponer anys a partir de los nombres de pestaña (e.g., Alumnes_2025-2026)
      try {
        const found = new Set<string>();
        for (const s of data.tabs || []) {
          const title = String(s.title || '');
          const m = title.match(/(20\d{2}-20\d{2})/);
          if (m && m[1]) found.add(m[1]);
        }
        suggested = Array.from(found);
        if (!anyCurs && suggested.length) anyCurs = suggested[0];
      } catch {}
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  function pick(val: string) {
    any = val;
    const map: Record<string,string|undefined> = { '1r': cfg['1r'], '2n': cfg['2n'], '3r': cfg['3r'], '4t': cfg['4t'] };
    spreadsheetId = (map[val] || '').trim();
  }

  async function importAlumnes() {
    try {
      if (!spreadsheetId || !anyCurs) throw new Error('Cal any curs i spreadsheetId');
      const r = await fetch('http://localhost:8081/import/alumnes', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, anyCurs })
      });
      const t = await r.text();
      if (!r.ok) throw new Error(t);
      try { toastSuccess('Import alumnes OK'); } catch {}
    } catch (e: any) { try { toastError(e?.message || 'Error'); } catch {} }
  }

  async function importEntrevistes() {
    try {
      if (!spreadsheetId || !anyCurs) throw new Error('Cal any curs i spreadsheetId');
      const r = await fetch('http://localhost:8081/import/entrevistes', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, anyCurs })
      });
      const t = await r.text();
      if (!r.ok) throw new Error(t);
      try { toastSuccess('Import entrevistes OK'); } catch {}
    } catch (e: any) { try { toastError(e?.message || 'Error'); } catch {} }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Diagnòstic Sheets</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

<div style="display:grid; gap:12px; max-width:920px;">
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end;">
    <div>
      <label style="font-size:12px; color:#6b7280;">Curs</label>
      <select bind:value={any} onchange={(e) => pick((e.target as HTMLSelectElement).value)} style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:140px;">
        <option value="">(manual)</option>
        <option value="1r">1r ESO</option>
        <option value="2n">2n ESO</option>
        <option value="3r">3r ESO</option>
        <option value="4t">4t ESO</option>
      </select>
    </div>
    <div style="flex:1; min-width:280px;">
      <label style="font-size:12px; color:#6b7280;">Spreadsheet ID</label>
      <input bind:value={spreadsheetId} placeholder="1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="display:block; width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px;" />
    </div>
    <div>
      <label style="font-size:12px; color:#6b7280;">Any curs</label>
      <input list=" anys" bind:value={anyCurs} placeholder="2025-2026" style="display:block; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:140px;" />
      <datalist id=" anys">
        {#each suggested as s}
          <option value={s} />
        {/each}
      </datalist>
    </div>
    <button onclick={run} style="padding:10px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:10px;">Provar</button>
    <button onclick={() => importAlumnes()} style="padding:10px 14px; border:1px solid #0ea5e9; background:#0ea5e9; color:#fff; border-radius:10px;">Importar alumnes</button>
    <button onclick={() => importEntrevistes()} style="padding:10px 14px; border:1px solid #10b981; background:#10b981; color:#fff; border-radius:10px;">Importar entrevistes</button>
  </div>

  {#if loading}
    <div style="color:#64748b;">Carregant…</div>
  {:else if error}
    <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px; white-space:pre-wrap;">{error}</div>
  {:else if data}
    <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
      <div><strong>ID:</strong> {data.spreadsheetId}</div>
      <div style="margin-top:8px; display:grid; gap:6px;">
        {#each data.tabs as t}
          <div style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:10px; display:flex; justify-content:space-between;">
            <span>{t.title} ({t.grid.rows}x{t.grid.cols})</span>
            <span style="color:#2563eb;">files: {t.rows}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

