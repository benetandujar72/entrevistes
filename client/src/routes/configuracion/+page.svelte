<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	let activeTab = $state('general');
	
	// Definir las pestañas disponibles
	const tabs = [
		{ id: 'general', label: 'General', icon: '⚙️', route: '/config' },
		{ id: 'horaris', label: 'Horaris', icon: '🕐', route: '/configuracion-horarios' },
		{ id: 'diagnostic', label: 'Diagnòstic', icon: '🔍', route: '/diagnostic' }
	];
	
	// Detectar la pestaña activa basada en la ruta actual
	onMount(() => {
		const currentPath = $page.url.pathname;
		const currentTab = tabs.find(tab => tab.route === currentPath);
		if (currentTab) {
			activeTab = currentTab.id;
		}
	});
	
	function setActiveTab(tabId: string) {
		activeTab = tabId;
		const tab = tabs.find(t => t.id === tabId);
		if (tab) {
			window.location.href = tab.route;
		}
	}
</script>

<div style="min-height: 100vh; background: var(--bg);">
	<!-- Header -->
	<div style="background: white; border-bottom: 1px solid #e5e7eb; padding: 24px;">
		<div style="max-width: 1200px; margin: 0 auto;">
			<h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #111827;">
				Configuració
			</h1>
			<p style="margin: 0; color: #6b7280; font-size: 16px;">
				Gestiona la configuració general, horaris i diagnòstic del sistema
			</p>
		</div>
	</div>
	
	<!-- Tabs Navigation -->
	<div style="background: white; border-bottom: 1px solid #e5e7eb;">
		<div style="max-width: 1200px; margin: 0 auto; padding: 0 24px;">
			<nav style="display: flex; gap: 8px; margin-bottom: -1px;">
				{#each tabs as tab}
					<button
						onclick={() => setActiveTab(tab.id)}
						style="
							padding: 12px 20px;
							border: none;
							background: {activeTab === tab.id ? 'white' : 'transparent'};
							color: {activeTab === tab.id ? '#111827' : '#6b7280'};
							border-bottom: 2px solid {activeTab === tab.id ? '#2563eb' : 'transparent'};
							cursor: pointer;
							font-size: 14px;
							font-weight: {activeTab === tab.id ? '600' : '500'};
							display: flex;
							align-items: center;
							gap: 8px;
							transition: all 0.2s;
							border-radius: 8px 8px 0 0;
						"
					>
						<span style="font-size: 16px;">{tab.icon}</span>
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>
	</div>
	
	<!-- Content Area -->
	<div style="max-width: 1200px; margin: 0 auto; padding: 24px;">
		<div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px; min-height: 400px;">
			{#if activeTab === 'general'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Configuració General</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona la configuració bàsica del sistema</p>
					<a 
						href="/config" 
						style="
							display: inline-flex;
							align-items: center;
							gap: 8px;
							padding: 12px 24px;
							background: #2563eb;
							color: white;
							text-decoration: none;
							border-radius: 8px;
							font-weight: 600;
							transition: background-color 0.2s;
						"
						onmouseover={(e) => (e.target as HTMLElement).style.background='#1d4ed8'}
						onmouseout={(e) => (e.target as HTMLElement).style.background='#2563eb'}
					>
						Obrir Configuració General
					</a>
				</div>
			{:else if activeTab === 'horaris'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">🕐</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Configuració d'Horaris</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona els horaris i disponibilitat del sistema</p>
					<a 
						href="/configuracion-horarios" 
						style="
							display: inline-flex;
							align-items: center;
							gap: 8px;
							padding: 12px 24px;
							background: #2563eb;
							color: white;
							text-decoration: none;
							border-radius: 8px;
							font-weight: 600;
							transition: background-color 0.2s;
						"
						onmouseover={(e) => (e.target as HTMLElement).style.background='#1d4ed8'}
						onmouseout={(e) => (e.target as HTMLElement).style.background='#2563eb'}
					>
						Obrir Configuració d'Horaris
					</a>
				</div>
			{:else if activeTab === 'diagnostic'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Diagnòstic del Sistema</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Diagnostica i soluciona problemes del sistema</p>
					<a 
						href="/diagnostic" 
						style="
							display: inline-flex;
							align-items: center;
							gap: 8px;
							padding: 12px 24px;
							background: #2563eb;
							color: white;
							text-decoration: none;
							border-radius: 8px;
							font-weight: 600;
							transition: background-color 0.2s;
						"
						onmouseover={(e) => (e.target as HTMLElement).style.background='#1d4ed8'}
						onmouseout={(e) => (e.target as HTMLElement).style.background='#2563eb'}
					>
						Obrir Diagnòstic
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
