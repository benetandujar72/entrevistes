<script lang="ts">
  import { onMount } from 'svelte';
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com';
  import { setToken, getToken } from '$lib/auth';
  import { authHeaders } from '$lib';
  import { toastSuccess, toastError } from '$lib/toast';
  import Icon from '$lib/components/SimpleIcon.svelte';
  let token: string | null = getToken();
  let profile: any = null;
  // Solo Google OAuth - eliminadas opciones inseguras

  async function handleCredentialResponse(resp: any) {
    token = resp.credential;
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
      
      // Validar token con el backend
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
        const r = await fetch(`${backendUrl}/usuaris/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r.ok) {
          const data = await r.json();
          setToken(token);
          try { toastSuccess(`Benvingut ${data.email}`); } catch {}
          location.href = '/dashboard';
        } else {
          alert('Token inválido. Intenta de nuevo.');
        }
      } catch (error) {
        alert('Error validando token. Intenta de nuevo.');
      }
    }
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

  // Funciones inseguras eliminadas - Solo Google OAuth
</script>

<svelte:head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <meta name="google-signin-client_id" content="582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com" />
  <meta name="referrer" content="no-referrer-when-downgrade" />
</svelte:head>

<main class="login-page">
  <div class="login-container">
    <div class="login-card">
      <!-- Header -->
      <div class="login-header">
        <div class="login-logo">
          <div class="logo-icon">
            <Icon name="users" size={24} />
          </div>
          <h1 class="login-title">Entrevistes · INS</h1>
        </div>
        <p class="login-subtitle">
          Inicia sesión con tu cuenta de Google para acceder a la administración
        </p>
      </div>
      
      <!-- Google Sign-In -->
      <div class="google-signin">
        <div id="gsi-btn" class="gsi-button"></div>
      </div>
      
      <!-- Solo Google OAuth - Login directo eliminado -->
      
      <!-- Estado de carga -->
      {#if token}
        <div class="login-status">
          <Icon name="check-circle" size={16} />
          <span>Login realizado. Redirigiendo…</span>
        </div>
      {/if}
      
      <!-- Sección de desarrollo eliminada - Solo Google OAuth -->
    </div>
  </div>
</main>

<style>
  @import '$lib/design-system.css';
  
  .login-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, var(--slate-50) 0%, var(--primary-50) 100%);
    position: relative;
    overflow: hidden;
  }
  
  .login-page::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
  
  .login-container {
    width: 100%;
    max-width: 420px;
    position: relative;
    z-index: 1;
  }
  
  .login-card {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  [data-theme="dark"] .login-card {
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .login-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .logo-icon {
    width: 3rem;
    height: 3rem;
    background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
    color: white;
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }
  
  .login-title {
    margin: 0;
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--fg);
    background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .login-subtitle {
    margin: 0;
    color: var(--fg-secondary);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
  }
  
  .google-signin {
    margin-bottom: 1.5rem;
  }
  
  .gsi-button {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  
  /* Estilos de login directo eliminados */
  
  .login-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--success-50);
    color: var(--success-600);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  
  /* Estilos de desarrollo eliminados */
  
  /* Animaciones */
  .login-card {
    animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Responsive */
  @media (max-width: 480px) {
    .login-page {
      padding: 1rem;
    }
    
    .login-title {
      font-size: var(--text-xl);
    }
  }
</style>
