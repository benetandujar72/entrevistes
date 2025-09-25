<script lang="ts">
  import { loadConfigSpreadsheets, saveConfigSpreadsheets, type ConfigSpreadsheets } from '$lib';
  import { authHeaders } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';
  import Icon from '$lib/components/SimpleIcon.svelte';
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

<div class="page-header">
  <h1 class="page-title">
    <Icon name="settings" size={24} />
    Configuració
  </h1>
  <p class="page-subtitle">Introdueix els IDs de Google Sheets per cada curs (ESO).</p>
</div>

<div class="config-container">
  <div class="config-section">
    <div class="section-header">
      <Icon name="tag" size={20} />
      <h2>IDs de Google Sheets</h2>
    </div>
    
    <div class="form-grid">
      <div class="form-group">
        <label for="eso-1r" class="form-label">1r ESO</label>
        <input 
          id="eso-1r"
          bind:value={cfg['1r']} 
          placeholder="ID de Spreadsheet" 
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <label for="eso-2n" class="form-label">2n ESO</label>
        <input 
          id="eso-2n"
          bind:value={cfg['2n']} 
          placeholder="ID de Spreadsheet" 
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <label for="eso-3r" class="form-label">3r ESO</label>
        <input 
          id="eso-3r"
          bind:value={cfg['3r']} 
          placeholder="ID de Spreadsheet" 
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <label for="eso-4t" class="form-label">4t ESO</label>
        <input 
          id="eso-4t"
          bind:value={cfg['4t']} 
          placeholder="ID de Spreadsheet" 
          class="form-input"
        />
      </div>
    </div>
    
    <div class="form-actions">
      <button onclick={save} class="btn btn-filled-primary">
        <Icon name="check" size={16} />
        Guardar
      </button>
      {#if saved}
        <div class="success-message">
          <Icon name="check-circle" size={16} />
          <span>Guardat</span>
        </div>
      {/if}
    </div>
  </div>
  <div class="config-section">
    <div class="section-header">
      <Icon name="download" size={20} />
      <h2>Importar a BD</h2>
    </div>
    
    <div class="import-controls">
      <div class="form-group">
        <label for="any-curs" class="form-label">Any curs</label>
        <input 
          id="any-curs"
          bind:value={anyCurs} 
          placeholder="2025-2026" 
          class="form-input"
        />
      </div>
      
      <div class="button-group">
        <button 
          onclick={importAlumnes} 
          disabled={importing} 
          class="btn btn-filled-primary"
        >
          <Icon name="users" size={16} />
          Importar alumnes
        </button>
        <button 
          onclick={importEntrevistes} 
          disabled={importing} 
          class="btn btn-filled-success"
        >
          <Icon name="notes" size={16} />
          Importar entrevistes
        </button>
      </div>
      
      {#if msg}
        <div class="message-card">
          <Icon name="info" size={16} />
          <span>{msg}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="config-section">
    <div class="section-header">
      <Icon name="calendar" size={20} />
      <h2>Importació ESO per nivell (pestanya "{nivell} ESO")</h2>
    </div>
    
    <div class="eso-controls">
      <div class="form-row">
        <div class="form-group">
          <label for="nivell-select" class="form-label">Nivell</label>
          <select 
            id="nivell-select"
            bind:value={nivell} 
            class="form-select"
          >
          <option value="1r">1r ESO</option>
          <option value="2n">2n ESO</option>
          <option value="3r">3r ESO</option>
          <option value="4t">4t ESO</option>
        </select>
      </div>
        
        <div class="form-group">
          <label for="sheet-id" class="form-label">Sheet ID</label>
          <input 
            id="sheet-id"
            readonly 
            value={selectedSheetId} 
            class="form-input readonly"
          />
        </div>
      </div>
      
      <div class="button-group">
        <button 
          onclick={previewESO} 
          disabled={previewLoading} 
          class="btn btn-tonal-warning"
        >
          <Icon name="search" size={16} />
          Previsualitzar ESO
        </button>
        <button 
          onclick={previewEntrevistesTabs} 
          disabled={entrevistesPreviewLoading} 
          class="btn btn-tonal-purple"
        >
          <Icon name="notes" size={16} />
          Previsualitzar entrevistes per pestañas
        </button>
        <button 
          onclick={importESO} 
          disabled={importing || !previewSummary} 
          class="btn btn-filled-success"
        >
          <Icon name="download" size={16} />
          Importar ESO
        </button>
        <button 
          onclick={importEntrevistesFromTabs} 
          disabled={importing || !entrevistesTabsPreview.length} 
          class="btn btn-filled-danger"
        >
          <Icon name="download" size={16} />
          Importar entrevistes per pestañas
        </button>
      </div>
    </div>

    {#if previewSummary}
      <div class="preview-summary">
        <strong>{previewSummary.total}</strong> alumnes detectats. A crear: <strong>{previewSummary.toCreateAlumnes}</strong>, matrícules: <strong>{previewSummary.toCreateEnrolments}</strong>{previewSummary.truncated ? ' · (llista truncada)' : ''}.
      </div>
    {/if}

    {#if preview.length}
      <div class="preview-table">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Grup</th>
              <th>Any</th>
              <th>Nivell</th>
            </tr>
          </thead>
          <tbody>
            {#each preview as p}
              <tr>
                <td>{p.nom}</td>
                <td>{p.grup || '—'}</td>
                <td>{p.anyCurs}</td>
                <td>{p.nivell}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if previewByAlumne.length}
      <div class="preview-by-alumne">
        <div class="preview-by-alumne-title">Previsualització d'entrevistes per alumne</div>
        <div class="alumne-preview-grid">
        {#each previewByAlumne as row}
            <div class="alumne-preview-card">
              <div class="alumne-name">{row.nom}</div>
            {#if row.entrevistes?.length}
                <table class="entrevistes-table">
                <thead>
                  <tr>
                      <th>Data</th>
                      <th>Acords</th>
                  </tr>
                </thead>
                <tbody>
                  {#each row.entrevistes as it}
                    <tr>
                        <td>{it.when || '—'}</td>
                        <td style="white-space:pre-wrap;">{it.acords || '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {:else}
                <div class="no-entrevistes">Sense entrevistes</div>
            {/if}
          </div>
        {/each}
        </div>
      </div>
    {/if}

    <!-- Nueva sección: Previsualización de entrevistas por pestañas -->
    {#if showEntrevistesTabs && entrevistesTabsPreview.length > 0}
      <div class="entrevistes-tabs-section">
        <h3 class="tabs-section-title">
          <Icon name="notes" size={20} />
          Previsualització d'Entrevistes per Pestañas
        </h3>
        
        <!-- Estadísticas -->
        <div class="tabs-stats">
          <div class="tabs-stats-row">
            <div><strong>Pestañas detectades:</strong> {entrevistesTabsPreview.length}</div>
            <div><strong>Total entrevistes:</strong> {entrevistesTabsPreview.reduce((total, tab) => total + tab.entrevistes.length, 0)}</div>
            <div><strong>Curs destí:</strong> {anyCurs}</div>
          </div>
        </div>

        <!-- Sistema de pestañas -->
        <div class="tabs-container">
          
          <!-- Navegación de pestañas -->
          <div class="tabs-navigation">
            {#each entrevistesTabsPreview as tab}
              <button 
                class="tab-button"
                class:active={activeEntrevistesTab === tab.tabName}
                onclick={() => { activeEntrevistesTab = tab.tabName; }}
              >
                {tab.tabName} ({tab.entrevistes.length})
              </button>
            {/each}
            
            <!-- Pestaña de historial -->
            <button 
              class="tab-button"
              class:active={activeEntrevistesTab === 'HISTORIC'}
              onclick={() => { activeEntrevistesTab = 'HISTORIC'; }}
            >
              HISTÒRIC ({entrevistesHistorial.length})
            </button>
          </div>

          <!-- Contenido de las pestañas -->
          <div class="tabs-content">
            {#if activeEntrevistesTab === 'HISTORIC'}
              <!-- Vista de historial consolidado -->
              <h4 class="tab-title">Historial Consolidat</h4>
              {#if entrevistesHistorial.length === 0}
                <p class="no-tab-content">No hi ha entrevistes al historial</p>
              {:else}
                <div class="entrevistas-grid">
                  {#each entrevistesHistorial as entrevista}
                    <div class="entrevista-card">
                      <div class="entrevista-header">
                        <div class="entrevista-alumne">
                          {entrevista.alumneId || '—'}
                        </div>
                        <div class="entrevista-date">
                          {formatDate(entrevista.data)}
                        </div>
                      </div>
                      <div class="entrevista-details">
                        <strong>Pestaña:</strong> {entrevista.tabName}
                      </div>
                      <div class="entrevista-content">
                        {entrevista.acords || '—'}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else if activeEntrevistesTab}
              <!-- Vista de pestaña específica -->
              <h4 class="tab-title">Pestaña: {activeEntrevistesTab}</h4>
              {@const entrevistes = getTabEntrevistes(activeEntrevistesTab)}
              {#if entrevistes.length === 0}
                <p class="no-tab-content">No hi ha entrevistes en aquesta pestaña</p>
              {:else}
                <div class="entrevistas-grid">
                  {#each entrevistes as entrevista}
                    <div class="entrevista-card">
                      <div class="entrevista-header">
                        <div class="entrevista-alumne">
                          {entrevista.alumneId || '—'}
                        </div>
                        <div class="entrevista-date">
                          {formatDate(entrevista.data)}
                        </div>
                      </div>
                      <div class="entrevista-details">
                        <strong>ID:</strong> {entrevista.id || '—'} | 
                        <strong>Curs:</strong> {entrevista.anyCurs || '—'} |
                        <strong>Autor:</strong> {entrevista.usuariCreadorId || '—'}
                      </div>
                      <div class="entrevista-content">
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
  <div aria-busy="true" class="loading-overlay">
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">Processant dades…</div>
    </div>
  </div>
{/if}

<style>
  /* === PAGE HEADER === */
  .page-header {
    margin-bottom: 2rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    color: var(--fg-secondary);
    font-size: var(--text-base);
    margin: 0;
  }

  /* === CONFIG CONTAINER === */
  .config-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;
  }

  /* === CONFIG SECTIONS === */
  .config-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--card-shadow);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .section-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  /* === FORM GRID === */
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
  }

  .form-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg-secondary);
  }

  .form-input,
  .form-select {
    padding: 0.75rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--input-bg);
    color: var(--fg);
    transition: all 0.2s ease;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .form-input.readonly {
    background: var(--google-grey-50);
    color: var(--google-grey-600);
    cursor: not-allowed;
  }

  /* === FORM ACTIONS === */
  .form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--success-600);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  /* === IMPORT CONTROLS === */
  .import-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .eso-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* === MESSAGE CARD === */
  .message-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
    border-radius: var(--radius-md);
    color: var(--primary-700);
    font-size: var(--text-sm);
  }

  /* === PREVIEW SUMMARY === */
  .preview-summary {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--google-grey-50);
    border: 1px solid var(--google-grey-200);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--fg);
  }

  /* === PREVIEW TABLE === */
  .preview-table {
    margin-top: 1rem;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .preview-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .preview-table th {
    text-align: left;
    border-bottom: 1px solid var(--border);
    padding: 0.75rem;
    background: var(--google-grey-50);
    font-weight: 600;
    color: var(--fg);
  }

  .preview-table td {
    border-bottom: 1px solid var(--google-grey-200);
    padding: 0.75rem;
    color: var(--fg-secondary);
  }

  /* === PREVIEW BY ALUMNE === */
  .preview-by-alumne {
    margin-top: 1rem;
  }

  .preview-by-alumne-title {
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--fg);
  }

  .alumne-preview-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1rem;
    background: var(--card-bg);
    margin-bottom: 0.5rem;
  }

  .alumne-name {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--fg);
  }

  .entrevistes-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }

  .entrevistes-table th {
    text-align: left;
    border-bottom: 1px solid var(--border);
    padding: 0.5rem;
    background: var(--google-grey-50);
    font-weight: 600;
    font-size: var(--text-xs);
    color: var(--fg);
  }

  .entrevistes-table td {
    border-bottom: 1px solid var(--google-grey-200);
    padding: 0.5rem;
    font-size: var(--text-xs);
    color: var(--fg-secondary);
  }

  .no-entrevistes {
    color: var(--google-grey-500);
    font-style: italic;
  }

  .alumne-preview-grid {
    display: grid;
    gap: 0.5rem;
  }

  .entrevistas-grid {
    display: grid;
    gap: 0.75rem;
  }

  /* === ENTREVISTES TABS PREVIEW === */
  .entrevistes-tabs-section {
    margin-top: 1.5rem;
    border-top: 2px solid #8b5cf6;
    padding-top: 1rem;
  }

  .tabs-section-title {
    margin: 0 0 0.75rem 0;
    color: #8b5cf6;
    font-size: var(--text-lg);
  }

  .tabs-stats {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--google-grey-100);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .tabs-stats-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .tabs-container {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card-bg);
    overflow: hidden;
  }

  .tabs-navigation {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--google-grey-50);
    overflow-x: auto;
  }

  .tab-button {
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--google-grey-600);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-button.active {
    background: var(--card-bg);
    color: var(--fg);
    border-bottom-color: #8b5cf6;
  }

  .tabs-content {
    padding: 1.25rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .tab-title {
    margin: 0 0 1rem 0;
    font-size: var(--text-base);
    color: var(--fg);
  }

  .no-tab-content {
    color: var(--google-grey-500);
    font-style: italic;
  }

  .entrevista-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    background: var(--google-grey-50);
    margin-bottom: 0.75rem;
  }

  .entrevista-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
  }

  .entrevista-alumne {
    font-weight: 600;
    color: var(--fg);
  }

  .entrevista-date {
    font-size: var(--text-xs);
    color: var(--google-grey-500);
  }

  .entrevista-details {
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    margin-bottom: 0.5rem;
  }

  .entrevista-content {
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    line-height: 1.5;
  }

  /* === LOADING OVERLAY === */
  .loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .loading-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.125rem 1.375rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 260px;
    box-shadow: var(--shadow-xl);
  }

  .loading-spinner {
    width: 1.75rem;
    height: 1.75rem;
    border: 3px solid var(--google-grey-200);
    border-top-color: var(--primary-600);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  .loading-text {
    color: var(--fg);
    font-weight: 600;
  }

  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-row {
      flex-direction: column;
    }

    .button-group {
      flex-direction: column;
    }

    .button-group .btn {
      width: 100%;
    }

    .tabs-stats-row {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  @keyframes spin { 
    from { transform: rotate(0deg) } 
    to { transform: rotate(360deg) } 
  }
</style>

