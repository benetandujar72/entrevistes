<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Svelte 5: usar $state para reactividad segura
	let mobileOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Entrevistes · Admin</title>
</svelte:head>

<header style="border-bottom:1px solid #e5e7eb; position:sticky; top:0; background:#fff; z-index:10;">
	<nav style="max-width: 1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:12px 16px;">
		<a href="/" style="display:flex; align-items:center; gap:8px; text-decoration:none; color:#111827;">
			<img src={favicon} alt="logo" width="24" height="24" />
			<strong>Entrevistes</strong>
		</a>
		<div class="desktop" style="display:none; gap:16px; align-items:center;">
			<a href="/dashboard">Dashboard</a>
			<a href="/alumnes">Alumnes</a>
			<a href="/entrevistes">Entrevistes</a>
			<a href="/cursos">Cursos</a>
			<a href="/config">Config</a>
		</div>
		<button class="mobilebtn" aria-label="menu" onclick={() => (mobileOpen = !mobileOpen)} style="background:transparent; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px;">
			☰
		</button>
	</nav>
	{#if mobileOpen}
		<div style="border-top:1px solid #e5e7eb; padding:8px 16px; display:flex; flex-direction:column; gap:8px;">
			<a href="/dashboard" onclick={() => (mobileOpen = false)}>Dashboard</a>
			<a href="/alumnes" onclick={() => (mobileOpen = false)}>Alumnes</a>
			<a href="/entrevistes" onclick={() => (mobileOpen = false)}>Entrevistes</a>
			<a href="/cursos" onclick={() => (mobileOpen = false)}>Cursos</a>
			<a href="/config" onclick={() => (mobileOpen = false)}>Config</a>
		</div>
	{/if}
</header>

<main style="max-width:1100px; margin: 24px auto; padding: 0 16px;">
	{@render children?.()}
</main>

<style>
@media (min-width: 768px) {
	.desktop { display:flex !important }
	.mobilebtn { display:none }
}
</style>
