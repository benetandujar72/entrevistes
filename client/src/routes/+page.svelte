<script lang="ts">
  import { onMount } from 'svelte';
  const CLIENT_ID = '582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com';
  import { setToken, getToken } from '$lib/auth';
  let token: string | null = getToken();
  let profile: any = null;

  function handleCredentialResponse(resp: any) {
    token = resp.credential;
    // Nota: para validar el token, enviar al backend en un flujo real
    profile = null;
    if (token) setToken(token);
    // redirigir a dashboard
    location.href = '/dashboard';
  }

  onMount(() => {
    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredentialResponse });
      // @ts-ignore
      window.google.accounts.id.renderButton(document.getElementById('gsi-btn'), { theme: 'outline', size: 'large', width: 280 });
    }
  });
</script>

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
  </div>
</main>
