<script lang="ts">
  import { onMount } from 'svelte';
  import { getToken } from '$lib/auth';

  type Usuari = { email: string; rol: 'admin' | 'docent' };
  let usuaris: Usuari[] = [];
  let email = '';
  let rol: 'admin' | 'docent' = 'docent';
  let error: string | null = null;
  let loading = true;
  let ok = false;

  async function carregar() {
    error = null; ok = false; loading = true;
    try {
      const r = await fetch('http://localhost:8081/usuaris', { headers: authHeaders() });
      if (!r.ok) throw new Error('No autoritzat o error');
      usuaris = await r.json();
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function guardar() {
    error = null; ok = false;
    try {
      const r = await fetch('http://localhost:8081/usuaris', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rol })
      });
      if (!r.ok) throw new Error('Error guardant');
      email = ''; rol = 'docent'; ok = true; await carregar();
    } catch (e: any) { error = e?.message ?? 'Error'; }
  }

  async function ferAdmin(addr: string) {
    error = null; ok = false;
    try {
      const r = await fetch('http://localhost:8081/usuaris', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, rol: 'admin' })
      });
      if (!r.ok) throw new Error('Error pujant a admin');
      ok = true; await carregar();
    } catch (e: any) { error = e?.message ?? 'Error'; }
  }

  function authHeaders(): HeadersInit {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  onMount(carregar);
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Usuaris (admin)</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

<div style="display:grid; gap:12px; max-width:720px;">
  {#if loading}
    <div style="display:grid; gap:8px;">
      {#each Array(2) as _}
        <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:12px; padding:12px;">
          <div style="height:12px; width:40%; background:#e5e7eb; border-radius:6px;"></div>
        </div>
      {/each}
    </div>
  {/if}
  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end;">
      <div>
        <label style="font-size:12px; color:#6b7280;">Email</label>
        <input bind:value={email} placeholder="email@insbitacola.cat" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:260px;" />
      </div>
      <div>
        <label style="font-size:12px; color:#6b7280;">Rol</label>
        <select bind:value={rol} style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px;">
          <option value="docent">docent</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button onclick={guardar} style="padding:8px 14px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Guardar</button>
    </div>
    {#if ok}<div style="margin-top:8px; color:#10b981;">Guardat</div>{/if}
    {#if error}<div style="margin-top:8px; color:#b91c1c;">{error}</div>{/if}
  </div>

  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
    <h2 style="margin:0 0 8px;">Llistat</h2>
    {#if usuaris.length === 0}
      <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:12px; padding:16px; text-align:center; color:#64748b;">Sense usuaris</div>
    {:else}
      <ul style="display:grid; gap:8px;">
        {#each usuaris as u}
          <li style="padding:12px; border:1px solid #e5e7eb; border-radius:12px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span style="color:#111827;">{u.email}</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#2563eb; font-weight:600; min-width:64px; text-align:right;">{u.rol}</span>
              {#if u.rol !== 'admin'}
                <button onclick={() => ferAdmin(u.email)} style="padding:6px 10px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Hacer admin</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>


