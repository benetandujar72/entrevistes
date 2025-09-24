<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { getToken, checkAuthStatus, isAuthDisabled } from '$lib/auth';
    import { page } from '$app/stores';
    import dashboardIcon from '$lib/assets/dashboard.svg';
    import studentsIcon from '$lib/assets/students.svg';
    import notesIcon from '$lib/assets/notes.svg';
    import tagIcon from '$lib/assets/tag.svg';
    import settingsIcon from '$lib/assets/settings.svg';
    import userIcon from '$lib/assets/user.svg';
    import usersIcon from '$lib/assets/users.svg';
    import sunIcon from '$lib/assets/sun.svg';
    import moonIcon from '$lib/assets/moon.svg';
    import { clearToken } from '$lib/auth';
    import { toastSuccess } from '$lib/toast';

	let { children } = $props();

	// Svelte 5: usar $state para reactividad segura
	let mobileOpen = $state(false);
    let isAdmin = $state(true); // Siempre admin en desarrollo local
    let userEmail = $state('');
    const ADMIN_KEY = 'entrevistes.isAdmin';
    let dark = $state(false);
    const THEME_KEY = 'entrevistes.theme';
    let authed = $state(true); // Siempre autenticado en desarrollo local

    onMount(async () => {
        // Para desarrollo local, establecer como admin por defecto
        isAdmin = true;
        userEmail = 'admin@entrevistes.local'; // Email por defecto para desarrollo
        try { localStorage.setItem(ADMIN_KEY, '1'); } catch {}
        
        // Verificar estado de autenticación del servidor
        let authDisabled = false;
        try {
            authDisabled = await checkAuthStatus();
        } catch (error) {
            console.log('Error verificando estado de autenticación:', error);
            // Si hay error, asumir que está deshabilitada para desarrollo
            authDisabled = true;
        }
        
        // Guard: si no hay token y no estamos en login, redirigir a inicio
        const t = getToken();
        // Para desarrollo local, siempre establecer como autenticado
        authed = true;
        const current = $page.url.pathname;
        
        // Si la autenticación está deshabilitada, permitir acceso directo
        if (authDisabled) {
            isAdmin = true; // Cuando la autenticación está deshabilitada, establecer como admin
            userEmail = 'admin@entrevistes.local'; // Email por defecto
            try { localStorage.setItem(ADMIN_KEY, '1'); } catch {}
            if (current === '/') {
                location.href = '/dashboard';
                return;
            }
        } else {
            // Solo permitir la página raíz de login cuando no hay token
            if (!t && current !== '/') {
                location.href = '/';
                return;
            }
            // Si hay token y estamos en "/", enviar a dashboard
            if (t && current === '/') {
                location.href = '/dashboard';
                return;
            }
        }
        // Cargar estado isAdmin persistido
        try {
            const persisted = localStorage.getItem(ADMIN_KEY);
            if (persisted) isAdmin = persisted === '1';
        } catch {}
        // Tema
        try {
            dark = (localStorage.getItem(THEME_KEY) || 'light') === 'dark';
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        } catch {}
        // Obtener rol via /usuaris/me
        if (t) {
            try {
                const r = await fetch('http://localhost:8081/usuaris/me', { headers: { Authorization: `Bearer ${t}` } });
                if (r.ok) {
                    const me = await r.json();
                    isAdmin = me?.role === 'admin';
                    userEmail = me?.email || 'admin@entrevistes.local';
                    try { localStorage.setItem(ADMIN_KEY, isAdmin ? '1' : '0'); } catch {}
                }
            } catch (error) {
                console.log('Error obteniendo datos del usuario:', error);
                // En caso de error, mantener valores por defecto
                userEmail = 'admin@entrevistes.local';
            }
        }
    });

    function toggleTheme() {
        dark = !dark;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch {}
        console.log('Tema cambiado a:', dark ? 'oscuro' : 'claro');
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
<div style="display:flex; min-height:100dvh; background: var(--bg); color: var(--fg);">
	<aside style="width:260px; background: var(--aside-bg); color: var(--aside-fg); display:flex; flex-direction:column;">
		<div style="padding:16px; border-bottom:1px solid rgba(148,163,184,.2);">
			<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
				<img src={favicon} alt="logo" width="22" height="22" />
				<strong>Entrevistes</strong>
			</div>
			{#if authed}
				<div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">{userEmail || 'admin@entrevistes.local'}</div>
			{/if}
			<div style="display:flex; gap:8px; align-items:center;">
				<button onclick={toggleTheme} style="padding:6px 10px; border:1px solid var(--btn-border); background: var(--btn-bg); color: var(--btn-fg); border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;">
					<img src={dark ? sunIcon : moonIcon} alt="" width="16" height="16" />
					<span style="font-size:12px;">{dark ? 'Clar' : 'Fosc'}</span>
				</button>
				<button onclick={logout} style="padding:6px 10px; border:1px solid var(--btn-border); background: var(--btn-bg); color: var(--btn-fg); border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;">Sortir</button>
			</div>
		</div>
		<nav style="padding:12px; display:grid; gap:8px;">
			<!-- Sección Principal -->
			<div style="padding:8px 12px 4px; color:var(--icon-fg); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Principal</div>
			<a href="/dashboard" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s; background:var(--nav-link-hover-bg);"><img src={dashboardIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Dashboard</span></a>
			
			<!-- Gestión Académica -->
			<div style="padding:16px 12px 4px; color:var(--icon-fg); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Gestió Acadèmica</div>
			<a href="/alumnes" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={studentsIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Alumnes</span></a>
			<a href="/cursos" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={tagIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Cursos</span></a>
			<a href="/entrevistes" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={notesIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Entrevistes</span></a>
			
			<!-- Herramientas Agrupadas -->
			<div style="padding:16px 12px 4px; color:var(--icon-fg); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Eines</div>
			<a href="/eines" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={notesIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Eines</span></a>
			
			<!-- Configuración Agrupada -->
			<div style="padding:16px 12px 4px; color:var(--icon-fg); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Configuració</div>
			<a href="/configuracion" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={settingsIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Configuració</span></a>
			
            {#if isAdmin}
				<!-- Administración Agrupada -->
				<div style="padding:16px 12px 4px; color:var(--icon-fg); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Administració</div>
				<a href="/administracio" style="padding:10px 12px; border-radius:8px; color:var(--nav-link-fg); text-decoration:none; display:flex; align-items:center; gap:10px; transition:all 0.2s;"><img src={userIcon} alt="" width="18" height="18" style="filter: brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);" /> <span>Administració</span></a>
			{/if}
		</nav>
	</aside>
	<main style="flex:1; padding:24px; background: var(--bg); color: var(--fg);">
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
    <main style="min-height:100dvh; display:grid; place-items:center; background: var(--bg); color: var(--fg);">
        <div style="padding:16px; border:1px solid #e5e7eb; background:#fff; border-radius:12px;">Redirigint al login…</div>
    </main>
{/if}
{/if}

<style>
:root{
  --bg:#f8fafc; --fg:#111827;
  --aside-bg:#0f172a; --aside-fg:#e5e7eb;
  --btn-bg:transparent; --btn-fg:#e5e7eb; --btn-border:rgba(148,163,184,.3);
  --icon-fg:#94a3b8;
  --nav-link-fg:#e5e7eb;
  --nav-link-hover-bg:rgba(148,163,184,.1);
}
[data-theme="dark"]{
  --bg:#0b1220; --fg:#e5e7eb;
  --aside-bg:#0b1324; --aside-fg:#e5e7eb;
  --btn-bg:rgba(148,163,184,.1); --btn-fg:#f1f5f9; --btn-border:rgba(148,163,184,.4);
  --icon-fg:#cbd5e1;
  --nav-link-fg:#f1f5f9;
  --nav-link-hover-bg:rgba(148,163,184,.15);
}
@media (min-width: 768px) {
	.desktop { display:flex !important }
	.mobilebtn { display:none }
}
</style>
