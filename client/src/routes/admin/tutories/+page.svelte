<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchTutories, importTutoriesCsv, eliminarTodasLasTutories, type Tutoria } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';

  let tutories: Tutoria[] = [];
  let loading = true;
  let error: string | null = null;
  let csvText = '';
  let importing = false;
  let eliminando = false;

  onMount(async () => {
    await reload();
  });

  async function reload() {
    loading = true; error = null;
    try { tutories = await fetchTutories(); }
    catch (e: any) { error = e?.message || 'Error'; }
    finally { loading = false; }
  }

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    csvText = text;
  }

  async function doImport() {
    if (!csvText.trim()) { try { toastError('CSV buit'); } catch {}; return; }
    importing = true;
    try {
      const r = await importTutoriesCsv(csvText);
      try { toastSuccess(`Importades ${r.importats}. Ambigües: ${r.ambigus}. Errors: ${r.errors}`); } catch {}
      await reload();
    } catch (e: any) {
      try { toastError(e?.message || 'Error importació'); } catch {}
      alert(e?.message || 'Error importació');
    } finally { importing = false; }
  }

  async function eliminarTodas() {
    if (!confirm('Estàs segur que vols eliminar TOTES les assignacions de tutories? Aquesta acció no es pot desfer.')) {
      return;
    }
    
    eliminando = true;
    try {
      const r = await eliminarTodasLasTutories();
      try { toastSuccess(`Eliminades ${r.eliminats} assignacions de tutories`); } catch {}
      await reload();
    } catch (e: any) {
      try { toastError(e?.message || 'Error eliminant tutories'); } catch {}
      alert(e?.message || 'Error eliminant tutories');
    } finally { eliminando = false; }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Tutories</h1>
  {#if !loading && tutories.length > 0}
    <div style="font-size:12px; color:#059669; margin-top:4px;">
      <span style="background:#ecfdf5; border:1px solid #d1fae5; padding:2px 8px; border-radius:999px;">
        {tutories.length} assignacions de tutories
      </span>
    </div>
  {/if}
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <input type="file" accept=".csv" onchange={onFile} style="display:block;" />
    <button onclick={doImport} disabled={importing} style="padding:8px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Importar CSV</button>
    <button onclick={eliminarTodas} disabled={eliminando || tutories.length === 0} style="padding:8px 14px; border:1px solid #dc2626; background:#dc2626; color:#fff; border-radius:8px; disabled:opacity:50%;">
      {eliminando ? 'Eliminant...' : 'Eliminar Totes'}
    </button>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
  {#if error}
    <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
  {/if}
</section>

{#if loading}
  <div>Carregant…</div>
{:else}
  <div style="overflow:auto; max-width:100%;">
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Alumne</th>
          <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Email</th>
          <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Tutor</th>
          <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding:6px 8px;">Curs</th>
        </tr>
      </thead>
      <tbody>
        {#each tutories as t}
          <tr>
            <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{t.alumne_nom || 'N/A'}</td>
            <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px; font-family:monospace; font-size:0.9em;">{t.alumne_email}</td>
            <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{t.tutor_email}</td>
            <td style="border-bottom:1px solid #f1f5f9; padding:6px 8px;">{t.any_curs}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}


