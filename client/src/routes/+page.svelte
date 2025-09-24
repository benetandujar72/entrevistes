<script lang="ts">
  import { onMount } from 'svelte';
  const CLIENT_ID = '582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com';
  import { setToken, getToken } from '$lib/auth';
  import { authHeaders } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';
  let token: string | null = getToken();
  let profile: any = null;
  let showDev = false;
  let seedEmail = 'benet.andujar@insbitacola.cat';

  function handleCredentialResponse(resp: any) {
    token = resp.credential;
    // Nota: para validar el token, enviar al backend en un flujo real
    profile = null;
    if (token) {
      // Validar dominio en el JWT (parte payload) para feedback temprano
      try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        const email: string | undefined = payload?.email?.toLowerCase?.();
        if (!email || !email.endsWith('@insbitacola.cat')) {
          alert('Domini no permès. Cal un compte @insbitacola.cat');
          return;
        }
      } catch {}
      setToken(token);
    }
    // redirigir a dashboard
    location.href = '/dashboard';
  }

  onMount(() => {
    try { showDev = location.hostname === 'localhost'; } catch {}
    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredentialResponse });
      // @ts-ignore
      window.google.accounts.id.renderButton(document.getElementById('gsi-btn'), { theme: 'outline', size: 'large', width: 280 });
    }
  });

  async function forceAdmin() {
    try {
      const r = await fetch('http://localhost:8081/usuaris/seed-admin', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: seedEmail })
      });
      const text = await r.text();
      if (!r.ok) throw new Error(text || 'Error');
      try { toastSuccess('Admin creat/confirmat'); } catch {}
      try { localStorage.setItem('entrevistes.isAdmin', '1'); } catch {}
      location.href = '/dashboard';
    } catch (e: any) {
      try { toastError(e?.message || 'Error'); } catch {}
      alert('Error forçant admin: ' + (e?.message || ''));
    }
  }
</script>

<svelte:head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <meta name="google-signin-client_id" content="582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com" />
  <meta name="referrer" content="no-referrer-when-downgrade" />
</svelte:head>

<main style="min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:24px; background: linear-gradient(180deg,#f8fafc,#eef2ff);">
  <div style="width:100%; max-width:420px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <div style="width:36px; height:36px; border-radius:10px; background:#2563eb; display:grid; place-items:center; color:#fff; font-weight:700;">E</div>
      <h1 style="margin:0; font-size:20px;">Entrevistes · INS</h1>
    </div>
    <p style="margin:0 0 16px; color:#4b5563;">Inicia sesión con tu cuenta de Google para acceder a la administración.</p>
    <div id="gsi-btn" style="display:flex; justify-content:center; margin-bottom:12px;"></div>
    {#if token}
      <div style="font-size:12px; color:#10b981;">Login realizado. Redirigiendo…</div>
    {/if}
    {#if showDev}
      <div style="border-top:1px solid #e5e7eb; margin:12px 0; padding-top:12px;">
        <label style="font-size:12px; color:#6b7280;">Forçar admin (dev)</label>
        <div style="display:flex; gap:8px; align-items:end;">
          <input bind:value={seedEmail} placeholder="email@insbitacola.cat" style="display:block; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; min-width:240px;" />
          <button onclick={forceAdmin} style="padding:8px 12px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:8px;">Forçar admin</button>
        </div>
      </div>
    {/if}
  </div>
</main>
