<script lang="ts">
  import { loadConfigSpreadsheets, saveConfigSpreadsheets, type ConfigSpreadsheets } from '$lib';
  import { authHeaders } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';
  let cfg: Partial<ConfigSpreadsheets> = loadConfigSpreadsheets();
  let saved = false;
  let anyCurs = '';
  let importing = false;
  let msg = '';

  // ESO import per nivell
  let nivell: '1r'|'2n'|'3r'|'4t' = '1r';
  let previewLoading = false;
  let preview: Array<{ nom: string; grup: string; anyCurs: string; nivell: string; action?: string }> = [];
  let previewSummary: { total: number; toCreateAlumnes: number; toCreateEnrolments: number; truncated?: boolean } | null = null;
  let previewByAlumne: Array<{ nom: string; entrevistes: Array<{ when: string; acords: string }> }> = [];
  let selectedSheetId: string = '';

  function save() {
    saveConfigSpreadsheets({
      '1r': (cfg['1r'] || '').trim(),
      '2n': (cfg['2n'] || '').trim(),
      '3r': (cfg['3r'] || '').trim(),
      '4t': (cfg['4t'] || '').trim()
    });
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }

  async function importAlumnes() {
    msg = ''; importing = true;
    try {
      const key = map(anyCurs);
      const id = key ? (cfg[key] || '').trim() : '';
      if (!id || !anyCurs) { msg = 'Falta ID o any'; return; }
      const r = await fetch('http://localhost:8080/import/alumnes', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs })
      });
      const text = await r.text();
      let data: any = {}; try { data = JSON.parse(text); } catch {}
      if (r.ok) {
        const num = data.imported ?? data.importats ?? 0;
        msg = `Alumnes importats: ${num}`;
        try { toastSuccess(msg); } catch {}
      } else {
        msg = (data.error || text || 'Error importació');
        try { toastError(msg); } catch {}
      }
    } finally { importing = false; }
  }

  async function importEntrevistes() {
    msg = ''; importing = true;
    try {
      const key = map(anyCurs);
      const id = key ? (cfg[key] || '').trim() : '';
      if (!id || !anyCurs) { msg = 'Falta ID o any'; return; }
      const r = await fetch('http://localhost:8080/import/entrevistes', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs })
      });
      const text = await r.text();
      let data: any = {}; try { data = JSON.parse(text); } catch {}
      if (r.ok) {
        const num = data.imported ?? data.importats ?? 0;
        msg = `Entrevistes importades: ${num}`;
        try { toastSuccess(msg); } catch {}
      } else {
        msg = (data.error || text || 'Error importació');
        try { toastError(msg); } catch {}
      }
    } finally { importing = false; }
  }

  function map(any: string): '1r'|'2n'|'3r'|'4t'|undefined {
    if (!any) return undefined as any;
    if (any.startsWith('1')) return '1r';
    if (any.startsWith('2')) return '2n';
    if (any.startsWith('3')) return '3r';
    if (any.startsWith('4')) return '4t';
    return undefined as any;
  }

  $: selectedSheetId = ((cfg as any)[nivell] || '').toString().trim();

  async function previewESO() {
    msg = ''; previewLoading = true; preview = []; previewSummary = null;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      const r = await fetch('http://localhost:8080/import/alumnes-eso/preview', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs, nivell })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Error preview ESO');
      preview = data.items || [];
      previewSummary = { total: data.total || 0, toCreateAlumnes: data.toCreateAlumnes || 0, toCreateEnrolments: data.toCreateEnrolments || 0, truncated: !!data.truncated };
      // Extra: previsualització d'entrevistes agrupades per alumne si el backend la retorna
      try { previewByAlumne = Array.isArray(data.byAlumne) ? data.byAlumne : []; } catch { previewByAlumne = []; }
    } catch (e: any) {
      msg = e?.message || 'Error preview ESO';
      try { toastError(msg); } catch {}
    } finally { previewLoading = false; }
  }

  async function previewEntrevistesESO() {
    msg = ''; previewLoading = true; previewByAlumne = [];
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      const r = await fetch('http://localhost:8080/import/entrevistes-eso/preview', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs, nivell })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Error preview entrevistes ESO');
      previewByAlumne = Array.isArray(data.byAlumne) ? data.byAlumne : [];
      // Si el backend no devolvió byAlumne, intentar usar items planos para construir vista minima
      if (!previewByAlumne.length && Array.isArray(data.items)) {
        const mapAlum: Record<string, Array<{ when: string; acords: string }>> = {};
        for (const it of data.items) {
          if (!it.nom) continue;
          (mapAlum[it.nom] ||= []).push({ when: it.when || '', acords: it.acords || '' });
        }
        previewByAlumne = Object.keys(mapAlum).map(n => ({ nom: n, entrevistes: mapAlum[n] }));
      }
      try { toastSuccess(`Previsualitzades ${previewByAlumne.length} fitxes d'entrevistes`); } catch {}
    } catch (e: any) {
      msg = e?.message || 'Error preview entrevistes ESO';
      try { toastError(msg); } catch {}
    } finally { previewLoading = false; }
  }

  async function importESO() {
    msg = ''; importing = true;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      const r = await fetch('http://localhost:8080/import/alumnes-eso', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs, nivell })
      });
      const text = await r.text();
      let data: any = {}; try { data = JSON.parse(text); } catch {}
      if (r.ok) {
        const num = data.importats ?? 0;
        msg = `Importació ESO (${nivell}) completada: ${num} alumnes`;
        try { toastSuccess(msg); } catch {}
      } else {
        msg = (data.error || text || 'Error importació ESO');
        try { toastError(msg); } catch {}
      }
    } finally { importing = false; }
  }

  async function importEntrevistesESO() {
    msg = ''; importing = true;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      const r = await fetch('http://localhost:8080/import/entrevistes', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs })
      });
      const text = await r.text();
      let data: any = {}; try { data = JSON.parse(text); } catch {}
      if (r.ok) {
        const num = data.imported ?? data.importats ?? 0;
        msg = `Entrevistes importades (${nivell}): ${num}`;
        try { toastSuccess(msg); } catch {}
      } else {
        msg = (data.error || text || 'Error importació entrevistes');
        try { toastError(msg); } catch {}
      }
    } finally { importing = false; }
  }
</script>

<h1>Configuració</h1>
<p>Introdueix els IDs de Google Sheets per cada curs (ESO).</p>

<div style="display:grid; gap:12px; max-width:720px;">
  <label>1r ESO
    <input bind:value={cfg['1r']} placeholder="ID de Spreadsheet" style="display:block; width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;" />
  </label>
  <label>2n ESO
    <input bind:value={cfg['2n']} placeholder="ID de Spreadsheet" style="display:block; width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;" />
  </label>
  <label>3r ESO
    <input bind:value={cfg['3r']} placeholder="ID de Spreadsheet" style="display:block; width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;" />
  </label>
  <label>4t ESO
    <input bind:value={cfg['4t']} placeholder="ID de Spreadsheet" style="display:block; width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;" />
  </label>
  <div>
    <button onclick={save} style="padding:8px 14px; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer;">Guardar</button>
    {#if saved}<span style="margin-left:8px; color:#10b981;">Guardat</span>{/if}
  </div>
  <div style="border-top:1px solid #e5e7eb; margin-top:12px; padding-top:12px;">
    <h2 style="margin:0 0 8px;">Importar a BD</h2>
    <div style="display:flex; gap:8px; align-items:end; flex-wrap:wrap;">
      <div>
        <label style="font-size:12px; color:#6b7280;">Any curs</label>
        <input bind:value={anyCurs} placeholder="2025-2026" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:160px;" />
      </div>
      <button onclick={importAlumnes} disabled={importing} style="padding:8px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Importar alumnes</button>
      <button onclick={importEntrevistes} disabled={importing} style="padding:8px 14px; border:1px solid #10b981; background:#10b981; color:#fff; border-radius:8px;">Importar entrevistes</button>
      {#if msg}<div style="color:#111827;">{msg}</div>{/if}
    </div>
  </div>

  <div style="border-top:1px solid #e5e7eb; margin-top:12px; padding-top:12px;">
    <h2 style="margin:0 0 8px;">Importació ESO per nivell (pestanya "{nivell} ESO")</h2>
    <div style="display:flex; gap:8px; align-items:end; flex-wrap:wrap;">
      <div>
        <label style="font-size:12px; color:#6b7280;">Nivell</label>
        <select bind:value={nivell} style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:120px;">
          <option value="1r">1r ESO</option>
          <option value="2n">2n ESO</option>
          <option value="3r">3r ESO</option>
          <option value="4t">4t ESO</option>
        </select>
      </div>
      <div>
        <label style="font-size:12px; color:#6b7280;">Sheet ID</label>
        <input readonly value={selectedSheetId} style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:340px; background:#f8fafc; color:#374151;" />
      </div>
      <button onclick={previewESO} disabled={previewLoading} style="padding:8px 14px; border:1px solid #eab308; background:#fef08a; color:#111827; border-radius:8px;">Previsualitzar ESO</button>
      <button onclick={previewEntrevistesESO} disabled={previewLoading} style="padding:8px 14px; border:1px solid #f59e0b; background:#fde68a; color:#111827; border-radius:8px;">Previsualitzar entrevistes ESO</button>
      <button onclick={importESO} disabled={importing || !previewSummary} style="padding:8px 14px; border:1px solid #16a34a; background:#16a34a; color:#fff; border-radius:8px;">Importar ESO</button>
      <button onclick={importEntrevistesESO} disabled={importing} style="padding:8px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Importar entrevistes ESO</button>
    </div>

    {#if previewSummary}
      <div style="margin-top:8px; color:#111827;">
        <strong>{previewSummary.total}</strong> alumnes detectats. A crear: <strong>{previewSummary.toCreateAlumnes}</strong>, matrícules: <strong>{previewSummary.toCreateEnrolments}</strong>{previewSummary.truncated ? ' · (llista truncada)' : ''}.
      </div>
    {/if}

    {#if preview.length}
      <div style="margin-top:8px; overflow:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Nom</th>
              <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Grup</th>
              <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Any</th>
              <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Nivell</th>
            </tr>
          </thead>
          <tbody>
            {#each preview as p}
              <tr>
                <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{p.nom}</td>
                <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{p.grup || '—'}</td>
                <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{p.anyCurs}</td>
                <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{p.nivell}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if previewByAlumne.length}
      <div style="margin-top:16px; font-weight:600;">Previsualització d'entrevistes per alumne</div>
      <div style="margin-top:8px; display:grid; gap:8px;">
        {#each previewByAlumne as row}
          <div style="border:1px solid #e5e7eb; border-radius:10px; padding:10px; background:#fff;">
            <div style="font-weight:600; margin-bottom:6px;">{row.nom}</div>
            {#if row.entrevistes?.length}
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:4px 6px;">Data</th>
                    <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:4px 6px;">Acords</th>
                  </tr>
                </thead>
                <tbody>
                  {#each row.entrevistes as it}
                    <tr>
                      <td style="border-bottom:1px solid #f1f5f9; padding:4px 6px;">{it.when || '—'}</td>
                      <td style="border-bottom:1px solid #f1f5f9; padding:4px 6px; white-space:pre-wrap;">{it.acords || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {:else}
              <div style="color:#64748b;">Sense entrevistes</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>


{#if importing || previewLoading}
  <div aria-busy="true" style="position:fixed; inset:0; background:rgba(15,23,42,.35); display:flex; align-items:center; justify-content:center; z-index:1000;">
    <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px 22px; display:flex; align-items:center; gap:12px; min-width:260px; box-shadow:0 10px 30px rgba(0,0,0,.1);">
      <div style="width:28px; height:28px; border:3px solid #e5e7eb; border-top-color:#2563eb; border-radius:50%; animation:spin 0.9s linear infinite;"></div>
      <div style="color:#111827; font-weight:600;">Processant dades…</div>
    </div>
  </div>
{/if}

<style>
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
</style>

