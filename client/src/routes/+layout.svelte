<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { getToken, checkAuthStatus, isAuthDisabled } from '$lib/auth';
    import { page } from '$app/stores';
    import { clearToken } from '$lib/auth';
    import { toastSuccess } from '$lib/toast';
    import Icon from '$lib/components/SimpleIcon.svelte';

	let { children } = $props();

	// Svelte 5: usar $state para reactividad segura
	let mobileOpen = $state(false);
    let sidebarCollapsed = $state(false);
    let isAdmin = $state(true);
    let userEmail = $state('');
    const ADMIN_KEY = 'entrevistes.isAdmin';
    let dark = $state(false);
    const THEME_KEY = 'entrevistes.theme';
    let authed = $state(false);
    const SIDEBAR_KEY = 'entrevistes.sidebarCollapsed';

    onMount(async () => {
        // Verificar estado de autenticación del servidor
        let authDisabled = false;
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
            const r = await fetch(`${backendUrl}/api/auth/status`);
            if (r.ok) {
                const data = await r.json();
                authDisabled = data.authDisabled;
            }
        } catch (error) {
            console.log('Error verificando estado de autenticación:', error);
            authDisabled = true;
        }
        
        const t = getToken();
        
        // Si la autenticación está deshabilitada, permitir acceso
        if (authDisabled) {
            authed = true;
            isAdmin = true;
            userEmail = 'admin@entrevistes.local';
        } else {
            // Si la autenticación está habilitada, verificar token válido
            if (t) {
                try {
                    // Verificar que el token es válido haciendo una petición autenticada
                    const backendUrl = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
                    const r = await fetch(`${backendUrl}/usuaris/me`, {
                        headers: { Authorization: `Bearer ${t}` }
                    });
                    if (r.ok) {
                        const data = await r.json();
                        authed = true;
                        isAdmin = data.role === 'admin';
                        userEmail = data.email;
                    } else {
                        // Token inválido
                        authed = false;
                        clearToken();
                        console.log('Token inválido - redirigiendo al login');
                        // Solo redirigir si no estamos ya en la página de login
                        if (window.location.pathname !== '/') {
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 1000);
                        }
                    }
                } catch (error) {
                    // Error verificando token
                    authed = false;
                    clearToken();
                    console.log('Error verificando token - redirigiendo al login');
                    // Solo redirigir si no estamos ya en la página de login
                    if (window.location.pathname !== '/') {
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 1000);
                    }
                }
            } else {
                // No hay token
                authed = false;
                console.log('No hay token - redirigiendo al login');
                // Solo redirigir si no estamos ya en la página de login
                if (window.location.pathname !== '/') {
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                }
            }
        }
        
        // Cargar estado isAdmin persistido
        try {
            const persisted = localStorage.getItem(ADMIN_KEY);
            if (persisted) isAdmin = persisted === '1';
        } catch {}
        
        // Cargar estado de sidebar
        try {
            sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';
        } catch {}
        
        // Tema
        try {
            dark = (localStorage.getItem(THEME_KEY) || 'light') === 'dark';
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        } catch {}
        
        // Obtener rol via /usuaris/me
        if (t) {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
                const r = await fetch(`${backendUrl}/usuaris/me`, { headers: { Authorization: `Bearer ${t}` } });
                if (r.ok) {
                    const data = await r.json();
                    isAdmin = data.role === 'admin';
                    userEmail = data.email;
                }
            } catch (error) {
                console.log('Error obteniendo datos del usuario:', error);
                isAdmin = true;
                userEmail = 'admin@entrevistes.local';
            }
        }
    });

    // Filtros para ignorar errores provocados por extensiones del navegador (e.g., chrome extensions)
    onMount(() => {
        try {
            const shouldIgnore = (msg: string, src?: string) => {
                const m = String(msg || '').toLowerCase();
                const s = String(src || '').toLowerCase();
                return (
                    m.includes('a listener indicated an asynchronous response by returning true, but the message channel closed') ||
                    m.includes('input must have uuid') ||
                    m.includes('classifier') ||
                    s.startsWith('chrome-extension://')
                );
            };

            const errorListener = (ev: ErrorEvent) => {
                const msg = String(ev?.message || (ev as any)?.error?.message || '');
                const src = String(ev?.filename || '');
                if (shouldIgnore(msg, src)) {
                    ev.preventDefault?.();
                    ev.stopImmediatePropagation?.();
                    return false as any;
                }
            };
            window.addEventListener('error', errorListener, true);

            const rejectionListener = (ev: PromiseRejectionEvent) => {
                const reason: any = (ev as any)?.reason;
                const msg = String((reason && (reason.message || reason)) || '');
                if (shouldIgnore(msg)) {
                    ev.preventDefault?.();
                }
            };
            window.addEventListener('unhandledrejection', rejectionListener, true);

            const originalConsoleError = (console.error as unknown) as (...args: any[]) => void;
            (console as any).error = (...args: any[]) => {
                const msg = args.map((a: any) => (typeof a === 'string' ? a : (a && a.message) || '')).join(' ');
                if (shouldIgnore(msg)) return;
                originalConsoleError(...args);
            };

            return () => {
                window.removeEventListener('error', errorListener, true);
                window.removeEventListener('unhandledrejection', rejectionListener, true);
                (console as any).error = originalConsoleError;
            };
        } catch {}
    });

    function toggleTheme() {
        dark = !dark;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch {}
        console.log('Tema cambiado a:', dark ? 'oscuro' : 'claro');
    }

    function toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed;
        try { localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.toString()); } catch {}
    }

    function logout() {
        clearToken();
        try { localStorage.setItem(ADMIN_KEY, '0'); } catch {}
        try { toastSuccess('Sessió tancada'); } catch {}
        console.log('Cerrando sesión...');
        location.href = '/';
    }
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Entrevistes · Admin</title>
</svelte:head>

{#if authed}
<div class="app-layout">
	<!-- Sidebar -->
	<aside class="sidebar" class:collapsed={sidebarCollapsed}>
		<!-- Header de la sidebar -->
		<div class="sidebar-header">
			<div class="sidebar-brand">
				<img src={favicon} alt="logo" width="24" height="24" />
				{#if !sidebarCollapsed}
					<span class="brand-text">Entrevistes</span>
				{/if}
			</div>
			
			<!-- Botón de colapsar -->
			<button 
				onclick={toggleSidebar} 
				class="sidebar-toggle"
				aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
			>
				<Icon name={sidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
			</button>
		</div>
		
		<!-- Información del usuario -->
		{#if !sidebarCollapsed}
			<div class="sidebar-user">
				<div class="user-info">
					<div class="user-avatar">
						<Icon name="user" size={16} />
					</div>
					<div class="user-details">
						<div class="user-name">{userEmail || 'admin@entrevistes.local'}</div>
						<div class="user-role">{isAdmin ? 'Administrador' : 'Docente'}</div>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Navegación -->
		<nav class="sidebar-nav">
			<!-- Sección Principal -->
			<div class="nav-section">
				{#if !sidebarCollapsed}
					<div class="nav-section-title">Principal</div>
				{/if}
				<a href="/dashboard" class="nav-link" class:active={$page.url.pathname === '/dashboard'}>
					<Icon name="dashboard" size={18} />
					{#if !sidebarCollapsed}<span>Dashboard</span>{/if}
				</a>
			</div>
			
			<!-- Gestión Académica -->
			<div class="nav-section">
				{#if !sidebarCollapsed}
					<div class="nav-section-title">Gestió Acadèmica</div>
				{/if}
				<a href="/alumnes" class="nav-link" class:active={$page.url.pathname.startsWith('/alumnes')}>
					<Icon name="users" size={18} />
					{#if !sidebarCollapsed}<span>Alumnes</span>{/if}
				</a>
				<a href="/cursos" class="nav-link" class:active={$page.url.pathname.startsWith('/cursos')}>
					<Icon name="tag" size={18} />
					{#if !sidebarCollapsed}<span>Cursos</span>{/if}
				</a>
				<a href="/entrevistes" class="nav-link" class:active={$page.url.pathname.startsWith('/entrevistes')}>
					<Icon name="notes" size={18} />
					{#if !sidebarCollapsed}<span>Entrevistes</span>{/if}
				</a>
        <a href="/gestio-cites" class="nav-link" class:active={$page.url.pathname.startsWith('/gestio-cites')}>
          <Icon name="calendar" size={18} />
          {#if !sidebarCollapsed}<span>Gestió de Cites</span>{/if}
        </a>
			</div>
			
			<!-- Herramientas -->
			<div class="nav-section">
				{#if !sidebarCollapsed}
					<div class="nav-section-title">Eines</div>
				{/if}
				<a href="/eines" class="nav-link" class:active={$page.url.pathname.startsWith('/eines')}>
					<Icon name="settings" size={18} />
					{#if !sidebarCollapsed}<span>Eines</span>{/if}
				</a>
				<a href="/importar-dades" class="nav-link" class:active={$page.url.pathname.startsWith('/importar-dades')}>
					<Icon name="upload" size={18} />
					{#if !sidebarCollapsed}<span>Importar Dades</span>{/if}
				</a>
			</div>
			
			<!-- Configuración -->
			<div class="nav-section">
				{#if !sidebarCollapsed}
					<div class="nav-section-title">Configuració</div>
				{/if}
				<a href="/configuracion" class="nav-link" class:active={$page.url.pathname.startsWith('/configuracion')}>
					<Icon name="settings" size={18} />
					{#if !sidebarCollapsed}<span>Configuració</span>{/if}
				</a>
			</div>
			
			<!-- Administración -->
			{#if isAdmin}
				<div class="nav-section">
					{#if !sidebarCollapsed}
						<div class="nav-section-title">Administració</div>
					{/if}
					<a href="/administracio" class="nav-link" class:active={$page.url.pathname.startsWith('/administracio')}>
						<Icon name="user" size={18} />
						{#if !sidebarCollapsed}<span>Administració</span>{/if}
					</a>
				</div>
			{/if}
		</nav>
		
		<!-- Footer de la sidebar -->
		<div class="sidebar-footer">
			<div class="sidebar-actions">
				<button 
					onclick={toggleTheme}
					class="theme-toggle"
				>
					<Icon name={dark ? 'sun' : 'moon'} size={16} />
					{#if !sidebarCollapsed}
						{dark ? 'Clar' : 'Fosc'}
					{/if}
				</button>
				<button 
					onclick={logout}
					class="logout-btn"
				>
					<Icon name="log-out" size={16} />
					{#if !sidebarCollapsed}
						Sortir
					{/if}
				</button>
			</div>
		</div>
	</aside>
	
	<!-- Contenido principal -->
	<main class="main-content">
		{@render children?.()}
	</main>
</div>
        {:else}
        <!-- No autenticado: solo renderizamos la página de login (ruta '/') sin menú -->
        {#if $page.url.pathname === '/'}
            <main style="flex:1; padding:0; background: var(--bg); color: var(--fg);">
                {@render children?.()}
            </main>
        {:else}
            <main style="display:flex; align-items:center; justify-content:center; min-height:100dvh; padding:24px; background: var(--bg); color: var(--fg);">
                <div style="padding:24px; border:1px solid var(--border); background:var(--card-bg); border-radius:12px; text-align:center; box-shadow:var(--shadow-sm);">
                    <div style="font-size:18px; font-weight:600; margin-bottom:8px; color:var(--fg);">Accés denegat</div>
                    <div style="font-size:14px; color:var(--fg-secondary); margin-bottom:16px;">Redirigint al login...</div>
                    <div style="font-size:12px; color:var(--fg-secondary);">Si no es redirigeix automàticament, <a href="/" style="color:var(--primary-600); text-decoration:none;">fes clic aquí</a></div>
                </div>
            </main>
        {/if}
        {/if}

        <style>
          /* Sistema de diseño ya importado globalmente */
  
  /* === LAYOUT PRINCIPAL === */
  .app-layout {
    display: flex;
    min-height: 100dvh;
    background: var(--bg);
    color: var(--fg);
  }
  
  /* === SIDEBAR === */
  .sidebar {
    width: 280px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 10;
  }
  
  .sidebar.collapsed {
    width: 64px;
  }
  
  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--sidebar-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  
  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    color: var(--fg);
  }
  
  .brand-text {
    font-size: var(--text-lg);
    transition: opacity 0.3s ease;
  }
  
  .sidebar.collapsed .brand-text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
  
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: var(--btn-ghost-hover);
    color: var(--fg);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .sidebar-toggle:hover {
    background: var(--btn-secondary-hover);
    transform: scale(1.05);
  }
  
  /* === USUARIO === */
  .sidebar-user {
    padding: 1rem;
    border-bottom: 1px solid var(--sidebar-border);
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    width: 2.5rem;
    height: 2.5rem;
    background: var(--primary-100);
    color: var(--primary-600);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
  
  .user-details {
    flex: 1;
    min-width: 0;
  }
  
  .user-name {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .user-role {
    font-size: var(--text-xs);
    color: var(--fg-secondary);
    margin-top: 0.125rem;
  }
  
  /* === NAVEGACIÓN === */
  .sidebar-nav {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
  }
  
  .nav-section {
    margin-bottom: 1.5rem;
  }
  
  .nav-section-title {
    padding: 0.5rem 1rem 0.25rem;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fg-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    margin: 0.125rem 0.5rem;
    color: var(--fg);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    font-weight: 500;
  }
  
  .nav-link:hover {
    background: var(--sidebar-item-hover);
    color: var(--primary-600);
    transform: translateX(2px);
  }
  
  .nav-link.active {
    background: var(--sidebar-item-active);
    color: var(--sidebar-item-active-fg);
    font-weight: 600;
  }
  
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 1.5rem;
    background: var(--primary-600);
    border-radius: 0 2px 2px 0;
  }
  
  .sidebar.collapsed .nav-link span {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
  
  /* === FOOTER === */
  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid var(--sidebar-border);
  }
  
  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .theme-toggle,
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    background: var(--btn-ghost-hover);
    color: var(--fg);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--text-sm);
  }
  
  .theme-toggle:hover,
  .logout-btn:hover {
    background: var(--btn-secondary-hover);
    transform: translateX(2px);
  }
  
  /* === CONTENIDO PRINCIPAL === */
  .main-content {
    flex: 1;
    padding: 2rem;
    background: var(--bg);
    color: var(--fg);
    overflow-y: auto;
  }
  
  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 50;
      transform: translateX(-100%);
    }
    
    .sidebar:not(.collapsed) {
      transform: translateX(0);
    }
    
    .main-content {
      padding: 1rem;
    }
  }
</style>
