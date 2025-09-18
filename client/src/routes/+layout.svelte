<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { getToken } from '$lib/auth';
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
    let isAdmin = $state(false);
    let userEmail = $state('');
    const ADMIN_KEY = 'entrevistes.isAdmin';
    let dark = $state(false);
    const THEME_KEY = 'entrevistes.theme';
    let authed = $state(false);

    onMount(async () => {
        // Guard: si no hay token y no estamos en login, redirigir a inicio
        const t = getToken();
        authed = !!t;
        const current = $page.url.pathname;
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
                const r = await fetch('http://localhost:8080/usuaris/me', { headers: { Authorization: `Bearer ${t}` } });
                if (r.ok) {
                    const me = await r.json();
                    isAdmin = me?.role === 'admin';
                    userEmail = me?.email || '';
                    try { localStorage.setItem(ADMIN_KEY, isAdmin ? '1' : '0'); } catch {}
                }
            } catch {}
        }
    });

    function toggleTheme() {
        dark = !dark;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch {}
    }

    function logout() {
        clearToken();
        try { localStorage.setItem(ADMIN_KEY, '0'); } catch {}
        try { toastSuccess('Sessió tancada'); } catch {}
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
		<div style="display:flex; align-items:center; gap:10px; padding:16px; border-bottom:1px solid rgba(148,163,184,.2); justify-content:space-between;">
			<div style="display:flex; align-items:center; gap:10px;">
				<img src={favicon} alt="logo" width="22" height="22" />
				<strong>Entrevistes</strong>
			</div>
        <div style="display:flex; gap:8px; align-items:center;">
            {#if authed}
                <span style="font-size:12px; color:#94a3b8;">{userEmail}</span>
            {/if}
				<button onclick={toggleTheme} style="padding:6px 10px; border:1px solid var(--btn-border); background: var(--btn-bg); color: var(--btn-fg); border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;">
					<img src={dark ? sunIcon : moonIcon} alt="" width="16" height="16" />
					<span style="font-size:12px;">{dark ? 'Clar' : 'Fosc'}</span>
				</button>
				<button onclick={logout} style="padding:6px 10px; border:1px solid var(--btn-border); background: var(--btn-bg); color: var(--btn-fg); border-radius:8px; display:flex; align-items:center; gap:8px; cursor:pointer;">Sortir</button>
			</div>
		</div>
		<nav style="padding:12px; display:grid; gap:6px;">
			<a href="/dashboard" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={dashboardIcon} alt="" width="18" height="18" /> <span>Dashboard</span></a>
			<a href="/alumnes" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={studentsIcon} alt="" width="18" height="18" /> <span>Alumnes</span></a>
			<a href="/entrevistes" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={notesIcon} alt="" width="18" height="18" /> <span>Entrevistes</span></a>
			<a href="/cursos" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={tagIcon} alt="" width="18" height="18" /> <span>Cursos</span></a>
			<div style="padding:18px 12px 6px; color:#94a3b8; font-size:12px;">Configuració</div>
			<a href="/config" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={settingsIcon} alt="" width="18" height="18" /> <span>Config</span></a>
			<a href="/diagnostic" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={settingsIcon} alt="" width="18" height="18" /> <span>Diagnòstic</span></a>
            {#if isAdmin}
				<div style="padding:18px 12px 6px; color:#94a3b8; font-size:12px;">Administració</div>
				<a href="/admin/usuaris" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={userIcon} alt="" width="18" height="18" /> <span>Usuaris</span></a>
                <a href="/admin/assignacions" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={usersIcon} alt="" width="18" height="18" /> <span>Assignacions</span></a>
                <a href="/admin/tutories" style="padding:10px 12px; border-radius:10px; color:#e5e7eb; text-decoration:none; display:flex; align-items:center; gap:10px;"><img src={usersIcon} alt="" width="18" height="18" /> <span>Tutories</span></a>
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
}
[data-theme="dark"]{
  --bg:#0b1220; --fg:#e5e7eb;
  --aside-bg:#0b1324; --aside-fg:#e5e7eb;
  --btn-bg:transparent; --btn-fg:#e5e7eb; --btn-border:rgba(148,163,184,.35);
}
@media (min-width: 768px) {
	.desktop { display:flex !important }
	.mobilebtn { display:none }
}
</style>
