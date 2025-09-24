<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // En desarrollo local, ir directamente al dashboard sin autenticación
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Configurar como admin automáticamente
      try {
        localStorage.setItem('entrevistes.isAdmin', '1');
        localStorage.setItem('entrevistes.token', 'dev-token');
      } catch {}
      
      // Ir al dashboard
      goto('/dashboard');
    }
  });
</script>

<main style="min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:24px; background: linear-gradient(180deg,#f8fafc,#eef2ff);">
  <div style="width:100%; max-width:420px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:24px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <div style="width:36px; height:36px; border-radius:10px; background:#2563eb; display:grid; place-items:center; color:#fff; font-weight:700;">E</div>
      <h1 style="margin:0; font-size:20px;">Entrevistes · INS</h1>
    </div>
    <p style="margin:0 0 16px; color:#4b5563;">Redirigiendo al dashboard...</p>
    <div style="display:flex; justify-content:center;">
      <div style="width:20px; height:20px; border:2px solid #e5e7eb; border-top:2px solid #2563eb; border-radius:50%; animation:spin 1s linear infinite;"></div>
    </div>
  </div>
</main>

<style>
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
