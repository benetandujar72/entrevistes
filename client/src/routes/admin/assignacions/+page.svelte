<script lang="ts">
  import { onMount } from 'svelte';
  import { authHeaders } from '$lib';

  type Assignacio = { email: string; grup_id: string; any_curs: string };
  let items: Assignacio[] = [];
  let email = '';
  let anyCurs = '';
  let grup = '';
  let csvText = '';
  let importing = false;
  let error: string | null = null;

  async function carregar() {
    error = null;
    try {
      const r = await fetch('http://localhost:8081/tutors/assignacions', { headers: authHeaders() });
      if (!r.ok) throw new Error('Error llistant');
      items = await r.json();
    } catch (e: any) { error = e?.message ?? 'Error'; }
  }

  async function crear() {
    error = null;
    try {
      const r = await fetch('http://localhost:8081/tutors/assignacions', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, anyCurs, grup })
      });
      if (!r.ok) throw new Error('Error creant');
      email = anyCurs = grup = '';
      await carregar();
    } catch (e: any) { error = e?.message ?? 'Error'; }
  }

  async function eliminar(a: Assignacio) {
    error = null;
    try {
      const r = await fetch('http://localhost:8081/tutors/assignacions', {
        method: 'DELETE', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: a.email, anyCurs: a.any_curs, grup: a.grup_id.replace(`_${a.any_curs}`, '') })
      });
      if (!r.ok) throw new Error('Error eliminant');
      await carregar();
    } catch (e: any) { error = e?.message ?? 'Error'; }
  }

  async function importar() {
    error = null; importing = true;
    try {
      const csvBase64 = btoa(unescape(encodeURIComponent(csvText)));
      const r = await fetch('http://localhost:8081/tutors/import', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvBase64 })
      });
      if (!r.ok) throw new Error('Error importació');
      csvText = '';
      await carregar();
    } catch (e: any) { error = e?.message ?? 'Error'; } finally { importing = false; }
  }

  onMount(carregar);
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Assignacions de tutors (admin)</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

<div style="display:grid; gap:12px; max-width:900px;">
  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end;">
      <div>
        <label for="email-input" style="font-size:12px; color:#6b7280;">Email</label>
        <input id="email-input" bind:value={email} placeholder="tutor@insbitacola.cat" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:260px;" />
      </div>
      <div>
        <label for="any-curs-input" style="font-size:12px; color:#6b7280;">Any curs</label>
        <input id="any-curs-input" bind:value={anyCurs} placeholder="2025-2026" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:160px;" />
      </div>
      <div>
        <label for="grup-input" style="font-size:12px; color:#6b7280;">Grup</label>
        <input id="grup-input" bind:value={grup} placeholder="1A" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:120px;" />
      </div>
      <button onclick={crear} style="padding:8px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Assignar</button>
    </div>
  </div>

  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
    <h2 style="margin:0 0 8px;">Importar CSV</h2>
    <p style="margin:0 0 8px; color:#64748b; font-size:14px;">Capçaleres requerides: <code>curs,grup,tutor_mail</code></p>
    <textarea bind:value={csvText} rows="6" placeholder="curs,grup,tutor_mail
2025-2026,1A,tutor1@insbitacola.cat" style="width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;"></textarea>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <button onclick={importar} disabled={importing} style="padding:8px 14px; border:1px solid #10b981; background:#10b981; color:#fff; border-radius:8px;">{importing ? 'Important…' : 'Importar'}</button>
      {#if error}<div style="color:#b91c1c;">{error}</div>{/if}
    </div>
  </div>

  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
    <h2 style="margin:0 0 8px;">Assignacions</h2>
    {#if items.length === 0}
      <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:12px; padding:16px; text-align:center; color:#64748b;">Sense assignacions</div>
    {:else}
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="text-align:left; border-bottom:1px solid #e5e7eb;">
            <th style="padding:8px;">Email</th>
            <th style="padding:8px;">Any</th>
            <th style="padding:8px;">Grup</th>
            <th style="padding:8px;">Accions</th>
          </tr>
        </thead>
        <tbody>
          {#each items as a}
            <tr>
              <td style="padding:8px;">{a.email}</td>
              <td style="padding:8px;">{a.any_curs}</td>
              <td style="padding:8px;">{a.grup_id}</td>
              <td style="padding:8px;">
                <button onclick={() => eliminar(a)} style="padding:6px 10px; border:1px solid #ef4444; background:#ef4444; color:#fff; border-radius:8px;">Eliminar</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>


