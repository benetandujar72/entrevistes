<script lang="ts">
  import { loadConfigSpreadsheets, saveConfigSpreadsheets, type ConfigSpreadsheets } from '$lib';
  let cfg: Partial<ConfigSpreadsheets> = loadConfigSpreadsheets();
  let saved = false;

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
</div>


