<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/SimpleIcon.svelte';
	
	let activeTab = $state('usuaris');
	
	// Definir las pestañas disponibles
	const tabs = [
		{ id: 'usuaris', label: 'Usuaris', icon: 'users', route: '/admin/usuaris' },
		{ id: 'assignacions', label: 'Assignacions', icon: 'notes', route: '/admin/assignacions' },
		{ id: 'tutories', label: 'Tutories', icon: 'user', route: '/admin/tutories' },
		{ id: 'tutores', label: 'Tutores', icon: 'user', route: '/admin/tutores' },
		{ id: 'estadistiques', label: 'Estadístiques', icon: 'dashboard', route: '/admin/estadisticas' }
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
            window.location.assign(tab.route);
        }
    }
</script>

<div style="min-height: 100vh; background: var(--bg);">
	<!-- Header -->
	<div style="background: white; border-bottom: 1px solid #e5e7eb; padding: 24px;">
		<div style="max-width: 1200px; margin: 0 auto;">
			<h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #111827;">
				Administració
			</h1>
			<p style="margin: 0; color: #6b7280; font-size: 16px;">
				Gestiona usuaris, assignacions, tutories i estadístiques del sistema
			</p>
		</div>
	</div>
	
	<!-- Tabs Navigation -->
	<div style="background: white; border-bottom: 1px solid #e5e7eb;">
		<div style="max-width: 1200px; margin: 0 auto; padding: 0 24px;">
			<nav style="display: flex; gap: 8px; margin-bottom: -1px; overflow-x: auto;">
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
							white-space: nowrap;
							flex-shrink: 0;
						"
					>
						<Icon name={tab.icon} size={16} />
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>
	</div>
	
	<!-- Content Area -->
	<div style="max-width: 1200px; margin: 0 auto; padding: 24px;">
		<div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px; min-height: 400px;">
			{#if activeTab === 'usuaris'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
						<Icon name="users" size={48} />
					</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Gestió d'Usuaris</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona els usuaris del sistema i els seus permisos</p>
					<a 
						href="/admin/usuaris" 
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
						Obrir Gestió d'Usuaris
					</a>
				</div>
			{:else if activeTab === 'assignacions'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
						<Icon name="notes" size={48} />
					</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Assignacions</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona les assignacions d'usuaris i rols</p>
					<a 
						href="/admin/assignacions" 
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
						Obrir Assignacions
					</a>
				</div>
			{:else if activeTab === 'tutories'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
						<Icon name="user" size={48} />
					</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Tutories</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona les tutories i el seu seguiment</p>
					<a 
						href="/admin/tutories" 
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
						Obrir Tutories
					</a>
				</div>
			{:else if activeTab === 'tutores'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
						<Icon name="user" size={48} />
					</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Tutores</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Gestiona els tutors i les seves assignacions</p>
					<a 
						href="/admin/tutores" 
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
						Obrir Tutores
					</a>
				</div>
			{:else if activeTab === 'estadistiques'}
				<div style="text-align: center; padding: 40px 20px;">
					<div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
						<Icon name="dashboard" size={48} />
					</div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Estadístiques</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Visualitza estadístiques i informes del sistema</p>
					<a 
						href="/admin/estadisticas" 
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
						Obrir Estadístiques
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>
