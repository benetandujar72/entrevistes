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

  // Variables para la nueva funcionalidad de entrevistas por pestañas
  let entrevistesTabsPreview: { tabName: string; entrevistes: any[] }[] = [];
  let entrevistesHistorial: any[] = [];
  let showEntrevistesTabs = false;
  let activeEntrevistesTab = '';
  let entrevistesPreviewLoading = false;

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
      const r = await fetch('http://localhost:8081/import/alumnes', {
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
      const r = await fetch('http://localhost:8081/import/entrevistes', {
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
      const r = await fetch('http://localhost:8081/import/alumnes-eso/preview', {
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


  async function importESO() {
    msg = ''; importing = true;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      const r = await fetch('http://localhost:8081/import/alumnes-eso', {
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


  // Nueva funcionalidad: Previsualizar entrevistas por pestañas
  async function previewEntrevistesTabs() {
    msg = ''; entrevistesPreviewLoading = true; 
    entrevistesTabsPreview = []; entrevistesHistorial = []; showEntrevistesTabs = false;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      
      const r = await fetch('http://localhost:8081/import/entrevistes-tabs-preview', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id, anyCurs: anyCurs })
      });
      
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Error previsualitzant entrevistes per pestañas');
      
      entrevistesTabsPreview = data.tabsData || [];
      entrevistesHistorial = data.historial || [];
      showEntrevistesTabs = true;
      
      // Activar primera pestaña si hay datos
      if (entrevistesTabsPreview.length > 0) {
        activeEntrevistesTab = entrevistesTabsPreview[0].tabName;
      }
      
      const totalEntrevistes = data.totalEntrevistes || 0;
      const totalTabs = data.totalTabs || 0;
      msg = `Previsualització: ${totalEntrevistes} entrevistes en ${totalTabs} pestañas`;
      try { toastSuccess(msg); } catch {}
      
    } catch (e: any) {
      msg = e?.message || 'Error previsualitzant entrevistes per pestañas';
      try { toastError(msg); } catch {}
    } finally { entrevistesPreviewLoading = false; }
  }

  // Nueva funcionalidad: Importar entrevistas desde previsualización
  async function importEntrevistesFromTabs() {
    if (!entrevistesTabsPreview.length) {
      msg = 'No hi ha dades de previsualització per importar';
      try { toastError(msg); } catch {}
      return;
    }

    msg = ''; importing = true;
    try {
      const id = (cfg[nivell] || '').trim();
      if (!id || !anyCurs || !nivell) { msg = 'Falten dades (ID, any o nivell)'; return; }
      
      const r = await fetch('http://localhost:8081/import/entrevistes-tabs-import', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          spreadsheetId: id, 
          anyCurs,
          tabsData: entrevistesTabsPreview 
        })
      });
      
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Error important entrevistes per pestañas');
      
      const importats = data.importats || 0;
      const ignorades = data.ignorades || 0;
      const tabsProcessed = data.tabsProcessed || 0;
      
      msg = `Importació completada: ${importats} entrevistes importades, ${ignorades} ignorades (${tabsProcessed} pestañas processades)`;
      try { toastSuccess(msg); } catch {}
      
    } catch (e: any) {
      msg = e?.message || 'Error important entrevistes per pestañas';
      try { toastError(msg); } catch {}
    } finally { importing = false; }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES');
    } catch {
      return dateStr;
    }
  }

  function getTabEntrevistes(tabName: string) {
    const tab = entrevistesTabsPreview.find(t => t.tabName === tabName);
    return tab ? tab.entrevistes : [];
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
      <button onclick={previewEntrevistesTabs} disabled={entrevistesPreviewLoading} style="padding:8px 14px; border:1px solid #8b5cf6; background:#e9d5ff; color:#111827; border-radius:8px;">Previsualitzar entrevistes per pestañas</button>
      <button onclick={importESO} disabled={importing || !previewSummary} style="padding:8px 14px; border:1px solid #16a34a; background:#16a34a; color:#fff; border-radius:8px;">Importar ESO</button>
      <button onclick={importEntrevistesFromTabs} disabled={importing || !entrevistesTabsPreview.length} style="padding:8px 14px; border:1px solid #dc2626; background:#dc2626; color:#fff; border-radius:8px;">Importar entrevistes per pestañas</button>
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

    <!-- Nueva sección: Previsualización de entrevistas por pestañas -->
    {#if showEntrevistesTabs && entrevistesTabsPreview.length > 0}
      <div style="margin-top:24px; border-top:2px solid #8b5cf6; padding-top:16px;">
        <h3 style="margin:0 0 12px; color:#8b5cf6; font-size:18px;">📋 Previsualització d'Entrevistes per Pestañas</h3>
        
        <!-- Estadísticas -->
        <div style="margin-bottom:16px; padding:12px; background:#f3f4f6; border-radius:8px; font-size:14px;">
          <div style="display:flex; gap:24px; flex-wrap:wrap;">
            <div><strong>Pestañas detectades:</strong> {entrevistesTabsPreview.length}</div>
            <div><strong>Total entrevistes:</strong> {entrevistesTabsPreview.reduce((total, tab) => total + tab.entrevistes.length, 0)}</div>
            <div><strong>Curs destí:</strong> {anyCurs}</div>
          </div>
        </div>

        <!-- Sistema de pestañas -->
        <div style="border:1px solid #e5e7eb; border-radius:12px; background:#fff; overflow:hidden;">
          
          <!-- Navegación de pestañas -->
          <div style="display:flex; border-bottom:1px solid #e5e7eb; background:#f9fafb; overflow-x:auto;">
            {#each entrevistesTabsPreview as tab}
              <button 
                style="
                  padding:12px 16px; 
                  border:none; 
                  background:{activeEntrevistesTab === tab.tabName ? '#fff' : 'transparent'}; 
                  color:{activeEntrevistesTab === tab.tabName ? '#111827' : '#6b7280'}; 
                  cursor:pointer;
                  font-size:14px;
                  font-weight:500;
                  border-bottom:2px solid {activeEntrevistesTab === tab.tabName ? '#8b5cf6' : 'transparent'};
                  transition:all 0.2s;
                  white-space:nowrap;
                "
                onclick={() => { activeEntrevistesTab = tab.tabName; }}
              >
                {tab.tabName} ({tab.entrevistes.length})
              </button>
            {/each}
            
            <!-- Pestaña de historial -->
            <button 
              style="
                padding:12px 16px; 
                border:none; 
                background:{activeEntrevistesTab === 'HISTORIC' ? '#fff' : 'transparent'}; 
                color:{activeEntrevistesTab === 'HISTORIC' ? '#111827' : '#6b7280'}; 
                cursor:pointer;
                font-size:14px;
                font-weight:500;
                border-bottom:2px solid {activeEntrevistesTab === 'HISTORIC' ? '#8b5cf6' : 'transparent'};
                transition:all 0.2s;
                white-space:nowrap;
              "
              onclick={() => { activeEntrevistesTab = 'HISTORIC'; }}
            >
              HISTÒRIC ({entrevistesHistorial.length})
            </button>
          </div>

          <!-- Contenido de las pestañas -->
          <div style="padding:20px; max-height:400px; overflow-y:auto;">
            {#if activeEntrevistesTab === 'HISTORIC'}
              <!-- Vista de historial consolidado -->
              <h4 style="margin:0 0 16px; font-size:16px; color:#111827;">Historial Consolidat</h4>
              {#if entrevistesHistorial.length === 0}
                <p style="color:#6b7280; font-style:italic;">No hi ha entrevistes al historial</p>
              {:else}
                <div style="display:grid; gap:12px;">
                  {#each entrevistesHistorial as entrevista}
                    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; background:#f9fafb;">
                      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                        <div style="font-weight:600; color:#111827;">
                          {entrevista.alumneId || '—'}
                        </div>
                        <div style="font-size:12px; color:#6b7280;">
                          {formatDate(entrevista.data)}
                        </div>
                      </div>
                      <div style="font-size:14px; color:#374151; margin-bottom:8px;">
                        <strong>Pestaña:</strong> {entrevista.tabName}
                      </div>
                      <div style="font-size:14px; color:#374151; line-height:1.5;">
                        {entrevista.acords || '—'}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else if activeEntrevistesTab}
              <!-- Vista de pestaña específica -->
              <h4 style="margin:0 0 16px; font-size:16px; color:#111827;">Pestaña: {activeEntrevistesTab}</h4>
              {@const entrevistes = getTabEntrevistes(activeEntrevistesTab)}
              {#if entrevistes.length === 0}
                <p style="color:#6b7280; font-style:italic;">No hi ha entrevistes en aquesta pestaña</p>
              {:else}
                <div style="display:grid; gap:12px;">
                  {#each entrevistes as entrevista}
                    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; background:#f9fafb;">
                      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                        <div style="font-weight:600; color:#111827;">
                          {entrevista.alumneId || '—'}
                        </div>
                        <div style="font-size:12px; color:#6b7280;">
                          {formatDate(entrevista.data)}
                        </div>
                      </div>
                      <div style="font-size:14px; color:#374151; margin-bottom:8px;">
                        <strong>ID:</strong> {entrevista.id || '—'} | 
                        <strong>Curs:</strong> {entrevista.anyCurs || '—'} |
                        <strong>Autor:</strong> {entrevista.usuariCreadorId || '—'}
                      </div>
                      <div style="font-size:14px; color:#374151; line-height:1.5;">
                        {entrevista.acords || '—'}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>


{#if importing || previewLoading || entrevistesPreviewLoading}
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

