<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import Icon from '$lib/components/SimpleIcon.svelte';
    import Tabs from '$lib/components/Tabs.svelte';
    import Button from '$lib/components/Button.svelte';
    
    let activeTab = $state('consolidacio');
    
    // Definir las pestañas disponibles
    const tabs = [
        { id: 'consolidacio', label: 'Consolidació', icon: 'notes', route: '/consolidacion' },
        { id: 'programador', label: 'Programador Cites', icon: 'calendar', route: '/programador-citas' },
        { id: 'emails', label: 'Emails Masius', icon: 'mail', route: '/emails-masivos' }
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
            <Tabs tabs={tabs} activeId={activeTab} onChange={(id)=>setActiveTab(id)} />
		</div>
	</div>
	
	<!-- Content Area -->
	<div style="max-width: 1200px; margin: 0 auto; padding: 24px;">
		<div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px; min-height: 400px;">
            {#if activeTab === 'consolidacio'}
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
                        <Icon name="notes" size={48} />
                    </div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Consolidació de Dades</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Consolida i processa les dades del sistema</p>
                    <Button variant="filled" size="md" leadingIcon="notes" href="/consolidacion">
                        Obrir Consolidació
                    </Button>
				</div>
            {:else if activeTab === 'programador'}
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
                        <Icon name="calendar" size={48} />
                    </div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Programador de Cites</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Programa i gestiona les cites del sistema</p>
                    <Button variant="filled" size="md" leadingIcon="calendar" href="/programador-citas">
                        Obrir Programador de Cites
                    </Button>
				</div>
            {:else if activeTab === 'emails'}
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: var(--primary-600);">
                        <Icon name="mail" size={48} />
                    </div>
					<h2 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Emails Masius</h2>
					<p style="margin: 0 0 24px; color: #6b7280;">Envia emails massius als usuaris del sistema</p>
                    <Button variant="filled" size="md" leadingIcon="mail" href="/emails-masivos">
                        Obrir Emails Masius
                    </Button>
				</div>
			{/if}
		</div>
	</div>
</div>
