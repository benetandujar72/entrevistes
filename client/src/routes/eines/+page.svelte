<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	let activeTab = $state('consolidacio');
	
	// Definir las pestañas disponibles
	const tabs = [
		{ id: 'consolidacio', label: 'Consolidació', icon: '📄', route: '/consolidacion' },
		{ id: 'programador', label: 'Programador Cites', icon: '📅', route: '/programador-citas' },
		{ id: 'emails', label: 'Emails Masius', icon: '📧', route: '/emails-masivos' }
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
				Eines
			</h1>
			<p style="margin: 0; color: #6b7280; font-size: 16px;">
				Utilitza les eines per consolidar dades, programar cites i enviar emails
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
			{#if activeTab === 'consolidacio'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">📄</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Consolidació de Dades</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Consolida i processa les dades del sistema</p>
					<a 
						href="/consolidacion" 
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
						Obrir Consolidació
					</a>
				</div>
			{:else if activeTab === 'programador'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">📅</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Programador de Cites</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Programa i gestiona les cites del sistema</p>
					<a 
						href="/programador-citas" 
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
						Obrir Programador de Cites
					</a>
				</div>
			{:else if activeTab === 'emails'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px;">📧</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Emails Masius</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Envia emails massius als usuaris del sistema</p>
					<a 
						href="/emails-masivos" 
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
						Obrir Emails Masius
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
