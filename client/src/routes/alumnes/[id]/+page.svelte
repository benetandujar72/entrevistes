<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { 
    obtenirDadesPersonals, 
    obtenirHistorialEntrevistes, 
    obtenirCitesCalendari,
    crearCitaCalendari,
    crearSolicitutCanvi,
    confirmarCita,
    eliminarAlumne,
    exportarDadesCSV,
    getMe,
    formatearFechaMadridSoloFecha,
    formatearFechaMadridSoloHora,
    type DadesPersonals, 
    type Entrevista, 
    type CitaCalendari,
    type Me
  } from '$lib';
  import { toastError, toastSuccess } from '$lib/toast';
  import Tabs from '$lib/components/Tabs.svelte';
  import Button from '$lib/components/Button.svelte';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let alumneId: string = '';
  let dadesPersonals: DadesPersonals | null = null;
  let historialEntrevistes: Entrevista[] = [];
  let citesCalendari: CitaCalendari[] = [];
  let loadingDades = true;
  let loadingEntrevistes = true;
  let loadingCites = true;
  let error: string | null = null;
  let activeTab: 'dades' | 'entrevistes' | 'calendari' = 'dades';
  let me: Me | null = null;
  let showCitaForm = false;
  let showSolicitutForm = false;
  let loadingCita = false;
  let loadingSolicitut = false;
  let citesLoaded = false;
  let entrevistesLoaded = false;

  // Estado para controlar las tarjetas expandidas
  let expandedEntries: Set<string> = new Set();

  function toggleExpanded(entrevistaId: string, index: number) {
    const key = `${entrevistaId}-${index}`;
    if (expandedEntries.has(key)) {
      expandedEntries.delete(key);
    } else {
      expandedEntries.add(key);
    }
    expandedEntries = expandedEntries; // Trigger reactivity
  }

  function isExpanded(entrevistaId: string, index: number): boolean {
    return expandedEntries.has(`${entrevistaId}-${index}`);
  }

  // Función para detectar si una entrevista es consolidada (tiene múltiples fechas)
  function isEntrevistaConsolidada(entrevista: Entrevista): boolean {
    // Una entrevista es consolidada si tiene pestana_origen (viene de consolidación)
    // Y además tiene múltiples entradas separadas por ---
    return !!(entrevista.pestana_origen && entrevista.acords && entrevista.acords.includes('---'));
  }

  // Función para obtener color según la pestaña de origen
  function getColorByPestana(pestana: string): { bg: string, border: string, badge: string } {
    const colors: Record<string, { bg: string, border: string, badge: string }> = {
      '1r ESO': { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#3b82f6', badge: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
      '2n ESO': { bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', border: '#ec4899', badge: 'linear-gradient(135deg, #ec4899, #db2777)' },
      '3r ESO': { bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#10b981', badge: 'linear-gradient(135deg, #10b981, #059669)' },
      '4t ESO': { bg: 'linear-gradient(135deg, #fed7aa, #fdba74)', border: '#f97316', badge: 'linear-gradient(135deg, #f97316, #ea580c)' },
    };
    return colors[pestana] || { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', badge: 'linear-gradient(135deg, #f59e0b, #d97706)' };
  }

  type ConsolidatedEntry = {
    dataLine: string;
    dataLabel: string;
    paragraphs: string[];
    snippet: string;
  };

  function getConsolidatedEntries(acords: string): ConsolidatedEntry[] {
    if (!acords) return [];

    return acords
      .split(/---+/g)
      .map((entry) => entry.replace(/\r/g, '').trim())
      .filter((entry) => entry.length > 0)
      .map((entry, entryIndex) => {
        const lines = entry
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const dataLine = lines.find((line) => /^Data:/i.test(line)) ?? '';
        const dataLabel = dataLine.replace(/^Data:\s*/i, '').trim() || `Entrevista ${entryIndex + 1}`;

        const acordsIndex = lines.findIndex((line) => /^Acords:/i.test(line));
        let paragraphs: string[] = [];

        if (acordsIndex !== -1) {
          const firstLine = lines[acordsIndex].replace(/^Acords:\s*/i, '').trim();
          paragraphs = [firstLine, ...lines.slice(acordsIndex + 1)];
        } else {
          paragraphs = lines.filter((line) => !/^Data:/i.test(line));
        }

        const cleanParagraphs = paragraphs
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const finalParagraphs = cleanParagraphs.length > 0 ? cleanParagraphs : ['Sense acords registrats'];
        const plainText = finalParagraphs.join(' ');
        const snippet = plainText.length > 160 ? `${plainText.slice(0, 160).trim()}…` : plainText;

        return {
          dataLine: dataLine || dataLabel,
          dataLabel,
          paragraphs: finalParagraphs,
          snippet
        };
      });
  }

  // Función para debuggear clics en enlaces de email
  function handleEmailClick(event: MouseEvent) {
    console.log('🔍 DEBUG: Clic en enlace de email detectado');
    console.log('🔍 DEBUG: Evento:', event);
    console.log('🔍 DEBUG: Target:', event.target);
    console.log('🔍 DEBUG: Current Target:', event.currentTarget);
    
    const link = event.currentTarget as HTMLAnchorElement;
    console.log('🔍 DEBUG: Href del enlace:', link.href);
    console.log('🔍 DEBUG: Protocolo:', link.protocol);
    console.log('🔍 DEBUG: Navegador:', navigator.userAgent);
    
    // Verificar si el navegador soporta mailto
    if (link.protocol === 'mailto:') {
      console.log('✅ DEBUG: Protocolo mailto detectado correctamente');
    } else {
      console.log('❌ DEBUG: Problema con el protocolo mailto');
    }
    
    // Intentar abrir el enlace manualmente si es necesario
    try {
      window.open(link.href, '_blank');
      console.log('✅ DEBUG: window.open ejecutado');
    } catch (error) {
      console.log('❌ DEBUG: Error en window.open:', error);
    }
  }

  // Formulario para nueva cita
  let citaForm = {
    data_cita: '',
    durada_minuts: 30,
    nom_familia: '',
    email_familia: '',
    telefon_familia: '',
    notes: ''
  };

  // Formulario para solicitud de cambio
  let solicitutForm = {
    camp_modificar: 'email',
    valor_nou: '',
    justificacio: ''
  };

  onMount(async () => {
    alumneId = $page.params.id;
    me = await getMe();
    await cargarDades();
  });

  async function cargarDades() {
    try {
      loadingDades = true;
      dadesPersonals = await obtenirDadesPersonals(alumneId);
      console.log('Dades personals cargades:', dadesPersonals);
      console.log('Tutor personal email:', dadesPersonals?.tutor_personal_email);
      console.log('Tutor personal nom:', dadesPersonals?.tutor_personal_nom);
    } catch (e: any) {
      error = e?.message || 'Error carregant dades';
      toastError(error);
    } finally {
      loadingDades = false;
    }
  }

  async function loadHistorialEntrevistes() {
    try {
      loadingEntrevistes = true;
      historialEntrevistes = await obtenirHistorialEntrevistes(alumneId);
      console.log('LOADED HISTORIAL:', historialEntrevistes.length, 'interviews');
      historialEntrevistes.forEach((e, i) => {
        console.log(`  [${i}] pestana_origen:`, e.pestana_origen, 'curso_origen:', e.curso_origen, 'acords length:', e.acords?.length);
      });
      entrevistesLoaded = true;
    } catch (e: any) {
      toastError(e?.message || 'Error carregant entrevistes');
    } finally {
      loadingEntrevistes = false;
    }
  }

  async function loadCitesCalendari() {
    try {
      loadingCites = true;
      citesCalendari = await obtenirCitesCalendari(alumneId);
      citesLoaded = true;
    } catch (e: any) {
      toastError(e?.message || 'Error carregant cites');
    } finally {
      loadingCites = false;
    }
  }

  async function crearCita() {
    if (!citaForm.data_cita || !citaForm.nom_familia || !citaForm.email_familia || !citaForm.telefon_familia) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    try {
      loadingCita = true;
      await crearCitaCalendari(alumneId, citaForm);
      toastSuccess('Cita creada correctament');
      citaForm = {
        data_cita: '',
        durada_minuts: 30,
        nom_familia: '',
        email_familia: '',
        telefon_familia: '',
        notes: ''
      };
      showCitaForm = false;
      await loadCitesCalendari();
    } catch (e: any) {
      toastError(e?.message || 'Error creant cita');
    } finally {
      loadingCita = false;
    }
  }

  async function crearSolicitut() {
    if (!solicitutForm.valor_nou || !solicitutForm.justificacio) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    try {
      loadingSolicitut = true;
      await crearSolicitutCanvi({
        alumne_id: alumneId,
        tutor_solicitant: me?.email || '',
        camp_modificar: solicitutForm.camp_modificar,
        valor_actual: dadesPersonals?.tutor1_email || '',
        valor_nou: solicitutForm.valor_nou,
        justificacio: solicitutForm.justificacio
      });
      toastSuccess('Solicitud de canvi enviada correctament');
      solicitutForm = {
        camp_modificar: 'email',
        valor_nou: '',
        justificacio: ''
      };
      showSolicitutForm = false;
    } catch (e: any) {
      toastError(e?.message || 'Error enviant solicitud');
    } finally {
      loadingSolicitut = false;
    }
  }

  function crearNovaEntrevista() {
    if (!dadesPersonals) {
      console.log('❌ ERROR: dadesPersonals no disponibles');
      return;
    }
    
    console.log('🔍 DEBUG - dadesPersonals disponibles:', dadesPersonals);
    
    // Navegar a la página de nueva entrevista con todos los datos del alumne
    const params = new URLSearchParams({
      alumne: alumneId,
      nom: dadesPersonals.alumne_nom,
      grup: dadesPersonals.grup_nom,
      curs: dadesPersonals.any_curs || '',
      email: dadesPersonals.tutor1_email || dadesPersonals.alumne_email || '',
      telefon: dadesPersonals.tutor1_tel || dadesPersonals.alumne_telefon || '',
      tutor: dadesPersonals.tutor_personal_nom || dadesPersonals.tutor_nom || '',
      tutor_email: dadesPersonals.tutor_personal_email || dadesPersonals.tutor_email || '',
      // Dades del primer tutor per a la cita
      nom_familia: dadesPersonals.tutor1_nom || '',
      email_familia: dadesPersonals.tutor1_email || '',
      telefon_familia: dadesPersonals.tutor1_tel || ''
    });
    
    console.log('🔍 DEBUG - Parámetros generados:', params.toString());
    console.log('🔍 DEBUG - URL completa:', `/entrevistes/nova?${params.toString()}`);
    
    window.location.href = `/entrevistes/nova?${params.toString()}`;
  }

  function crearNovaCita() {
    console.log('🔍 DEBUG - Funció crearNovaCita executada!');
    console.log('🔍 DEBUG - activeTab actual:', activeTab);
    console.log('🔍 DEBUG - showCitaForm actual:', showCitaForm);
    
    if (!dadesPersonals) {
      console.log('❌ ERROR: dadesPersonals no disponibles');
      return;
    }
    
    console.log('🔍 DEBUG - Carregant dades del primer tutor per a la cita:', {
      tutor1_nom: dadesPersonals.tutor1_nom,
      tutor1_email: dadesPersonals.tutor1_email,
      tutor1_tel: dadesPersonals.tutor1_tel
    });
    
    console.log('🔍 DEBUG - Formulari abans de carregar:', citaForm);
    
    // Carregar dades del primer tutor al formulari de cita
    citaForm.nom_familia = dadesPersonals.tutor1_nom || '';
    citaForm.email_familia = dadesPersonals.tutor1_email || '';
    citaForm.telefon_familia = dadesPersonals.tutor1_tel || '';
    
    console.log('🔍 DEBUG - Formulari després de carregar:', citaForm);
    
    // Mostrar el formulari de cita
    showCitaForm = true;
    
    console.log('🔍 DEBUG - Formulari mostrat:', showCitaForm);
  }

  async function eliminarAlumneConfirmat() {
    if (!confirm('Estàs segur que vols eliminar aquest alumne? Aquesta acció no es pot desfer.')) {
      return;
    }

    try {
      await eliminarAlumne(alumneId);
      toastSuccess('Alumne eliminat correctament');
      window.location.href = '/alumnes';
    } catch (e: any) {
      toastError(e?.message || 'Error eliminant alumne');
    }
  }

  async function exportarCSV() {
    try {
      const blob = await exportarDadesCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dades_personals_${alumneId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastSuccess('Dades exportades correctament');
    } catch (e: any) {
      toastError(e?.message || 'Error exportant dades');
    }
  }

  async function handleConfirmarCita(citaId: string) {
    try {
      loadingCites = true;
      const resultat = await confirmarCita(citaId);
      toastSuccess('Cita confirmada i entrevista creada automàticament');
      await loadCitesCalendari();
      await loadHistorialEntrevistes();
    } catch (error: any) {
      toastError('Error confirmant cita: ' + error.message);
    } finally {
      loadingCites = false;
    }
  }

  function getEstatColor(estat: string) {
    switch (estat) {
      case 'pendent': return '#f59e0b';
      case 'confirmada': return '#10b981';
      case 'realitzada': return '#3b82f6';
      case 'cancelada': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getEstatText(estat: string) {
    switch (estat) {
      case 'pendent': return 'Pendent';
      case 'confirmada': return 'Confirmada';
      case 'realitzada': return 'Realitzada';
      case 'cancelada': return 'Cancelada';
      default: return estat;
    }
  }

  // Cargar datos cuando cambia la pestaña
  $: if (activeTab === 'entrevistes' && !entrevistesLoaded) {
    loadHistorialEntrevistes();
  }

  $: if (activeTab === 'calendari' && !citesLoaded) {
    loadCitesCalendari();
  }
</script>

<div class="container">
  {#if loadingDades}
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregant dades de l'alumne...</p>
    </div>
  {:else if error}
    <div class="error">
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  {:else if dadesPersonals}
    <!-- Header con información básica -->
    <div class="header">
      <div class="header-content">
        <div class="alumne-info">
          <h1 class="alumne-nom">{dadesPersonals.alumne_nom}</h1>
          <div class="alumne-details">
            <span class="detail-item">
              <Icon name="mail" size={14} /> 
              <a href="mailto:{dadesPersonals.alumne_email || ''}?subject=Contacte des de l'App d'Entrevistes&body=Hola {dadesPersonals.alumne_nom},%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                {dadesPersonals.alumne_email || 'No disponible'}
              </a>
            </span>
            <span class="detail-item">
              <Icon name="user" size={14} /> 
              <a href="mailto:{dadesPersonals.tutor_email || ''}?subject=Contacte des de l'App d'Entrevistes&body=Hola,%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes per parlar sobre {dadesPersonals.alumne_nom}.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                {dadesPersonals.tutor_email}
              </a>
            </span>
            {#if dadesPersonals.tutor_personal_email}
              <span class="detail-item">
                <Icon name="graduation-cap" size={14} /> 
                <a href="mailto:{dadesPersonals.tutor_personal_email}?subject=Contacte des de l'App d'Entrevistes&body=Hola,%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes per parlar sobre {dadesPersonals.alumne_nom}.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                  {dadesPersonals.tutor_personal_nom} ({dadesPersonals.tutor_personal_email})
                </a>
              </span>
            {/if}
            <span class="detail-item">
              <Icon name="tag" size={14} /> {dadesPersonals.grup_nom}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <Button variant="filled" leadingIcon="mail" on:click={crearNovaEntrevista}>Nova Entrevista</Button>
          {#if me?.role === 'admin'}
            <Button variant="tonal" leadingIcon="download" on:click={exportarCSV}>Exportar CSV</Button>
            <Button variant="outlined" leadingIcon="trash" on:click={eliminarAlumneConfirmat}>Eliminar</Button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Pestañas de navegación -->
    <div class="tabs-container">
      <Tabs tabs={[{id:'dades',label:'Dades del Alumne',icon:'user'},{id:'entrevistes',label:'Històric',icon:'notes'},{id:'calendari',label:'Calendari',icon:'calendar'}]} activeId={activeTab} onChange={(id)=> activeTab = id as any} />
    </div>

    <!-- Contenido de las pestañas -->
    <div class="tab-content">
      {#if activeTab === 'dades'}
        <!-- Pestaña: Dades del Alumne -->
        <div class="dades-section">
          <div class="section-header">
            <h2>Dades Personals</h2>
          </div>
          
          <div class="dades-grid">
            <!-- Información personal -->
            <div class="info-card personal">
              <div class="card-header">
                <h3>Informació Personal</h3>
              </div>
              <div class="card-content">
                <div class="info-row">
                  <span class="label">Nom complet:</span>
                  <span class="value">{dadesPersonals.alumne_nom}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">{dadesPersonals.alumne_email || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Sexe:</span>
                  <span class="value">{dadesPersonals.sexe === 'H' ? 'Home' : dadesPersonals.sexe === 'D' ? 'Dona' : 'Altres'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Data de naixement:</span>
                  <span class="value">{dadesPersonals.data_naixement || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Municipi de naixement:</span>
                  <span class="value">{dadesPersonals.municipi_naixement || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Nacionalitat:</span>
                  <span class="value">{dadesPersonals.nacionalitat || 'No disponible'}</span>
                </div>
              </div>
            </div>

            <!-- Documentación -->
            <div class="info-card documents">
              <div class="card-header">
                <h3>Documentació</h3>
              </div>
              <div class="card-content">
                <div class="info-row">
                  <span class="label">DNI/NIE:</span>
                  <span class="value">{dadesPersonals.doc_identitat || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">TIS:</span>
                  <span class="value">{dadesPersonals.tis || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">RALC:</span>
                  <span class="value">{dadesPersonals.ralc || 'No disponible'}</span>
                </div>
              </div>
            </div>

            <!-- Dirección -->
            <div class="info-card address">
              <div class="card-header">
                <h3>Adreça</h3>
              </div>
              <div class="card-content">
                <div class="info-row">
                  <span class="label">Adreça:</span>
                  <span class="value">{dadesPersonals.adreca || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Municipi:</span>
                  <span class="value">{dadesPersonals.municipi_residencia || 'No disponible'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Codi postal:</span>
                  <span class="value">{dadesPersonals.codi_postal || 'No disponible'}</span>
                </div>
              </div>
            </div>

            <!-- Tutores -->
            <div class="info-card tutors">
              <div class="card-header">
                <h3>Tutores</h3>
              </div>
              <div class="card-content">
                {#if dadesPersonals.tutor_personal_nom}
                  <div class="tutor-section">
                    <h4>Tutor/a Personal (Professor)</h4>
                    <div class="info-row">
                      <span class="label">Nom:</span>
                      <span class="value">{dadesPersonals.tutor_personal_nom}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Email:</span>
                      <span class="value">
                        {#if dadesPersonals.tutor_personal_email}
                          <a href="mailto:{dadesPersonals.tutor_personal_email}?subject=Contacte des de l'App d'Entrevistes&body=Hola,%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes per parlar sobre {dadesPersonals.alumne_nom}.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                            {dadesPersonals.tutor_personal_email}
                          </a>
                        {:else}
                          No disponible
                        {/if}
                      </span>
                    </div>
                  </div>
                {/if}

                {#if dadesPersonals.tutor1_nom}
                  <div class="tutor-section">
                    <h4>Tutor/a Legal 1</h4>
                    <div class="info-row">
                      <span class="label">Nom:</span>
                      <span class="value">{dadesPersonals.tutor1_nom}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Telèfon:</span>
                      <span class="value">{dadesPersonals.tutor1_tel || 'No disponible'}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Email:</span>
                      <span class="value">
                        {#if dadesPersonals.tutor1_email}
                          <a href="mailto:{dadesPersonals.tutor1_email}?subject=Contacte des de l'App d'Entrevistes&body=Hola,%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes per parlar sobre {dadesPersonals.alumne_nom}.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                            {dadesPersonals.tutor1_email}
                          </a>
                        {:else}
                          No disponible
                        {/if}
                      </span>
                    </div>
                  </div>
                {/if}
                
                {#if dadesPersonals.tutor2_nom}
                  <div class="tutor-section">
                    <h4>Tutor/a Legal 2</h4>
                    <div class="info-row">
                      <span class="label">Nom:</span>
                      <span class="value">{dadesPersonals.tutor2_nom}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Telèfon:</span>
                      <span class="value">{dadesPersonals.tutor2_tel || 'No disponible'}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Email:</span>
                      <span class="value">
                        {#if dadesPersonals.tutor2_email}
                          <a href="mailto:{dadesPersonals.tutor2_email}?subject=Contacte des de l'App d'Entrevistes&body=Hola,%0D%0A%0D%0AEm contacte des de l'aplicació d'entrevistes per parlar sobre {dadesPersonals.alumne_nom}.%0D%0A%0D%0AGràcies." class="email-link" target="_blank" rel="noopener noreferrer" onclick={handleEmailClick}>
                            {dadesPersonals.tutor2_email}
                          </a>
                        {:else}
                          No disponible
                        {/if}
                      </span>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>

      {:else if activeTab === 'entrevistes'}
        <!-- Pestaña: Històric Entrevistes -->
        <div class="entrevistes-section">
          <div class="section-header">
            <h2>Històric d'Entrevistes</h2>
            <Button variant="tonal" leadingIcon="mail" on:click={() => showSolicitutForm = !showSolicitutForm}>Solicitar Canvi de Dades</Button>
          </div>

          {#if showSolicitutForm}
            <div class="form-card">
              <h3>Solicitar Canvi de Dades</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Camp a modificar:</label>
                  <select bind:value={solicitutForm.camp_modificar}>
                    <option value="email">Email</option>
                    <option value="telefon">Telèfon</option>
                    <option value="adreca">Adreça</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nou valor:</label>
                  <input type="text" bind:value={solicitutForm.valor_nou} placeholder="Nou valor" />
                </div>
                <div class="form-group full-width">
                  <label>Justificació:</label>
                  <textarea bind:value={solicitutForm.justificacio} placeholder="Explica per què necessites aquest canvi"></textarea>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" onclick={crearSolicitut} disabled={loadingSolicitut}>
                  {loadingSolicitut ? 'Enviant...' : 'Enviar Solicitud'}
                </button>
                <button class="btn btn-secondary" onclick={() => showSolicitutForm = false}>
                  Cancel·lar
                </button>
              </div>
            </div>
          {/if}

          {#if loadingEntrevistes}
            <div class="loading">
              <div class="spinner"></div>
              <p>Carregant entrevistes...</p>
            </div>
          {:else if historialEntrevistes.length === 0}
            <div class="empty-state">
              <div class="empty-icon">No data</div>
              <h3>No hi ha entrevistes</h3>
              <p>Encara no s'han registrat entrevistes per aquest alumne.</p>
            </div>
          {:else}
            <div class="entrevistes-list">
              {#each historialEntrevistes as entrevista}
                {#if isEntrevistaConsolidada(entrevista)}
                  <!-- DEBUG: Consolidated interview detected -->
                  {console.log('CONSOLIDATED:', { id: entrevista.id, pestana: entrevista.pestana_origen, acords: entrevista.acords.substring(0, 100) })}
                  {#each getConsolidatedEntries(entrevista.acords) as entry, entryIndex}
                    {@const colorScheme = getColorByPestana(entrevista.pestana_origen || 'Default')}
                    {@const expanded = isExpanded(entrevista.id, entryIndex)}

                    <div class="entrevista-card entrevista-consolidada"
                         class:expanded={expanded}
                         style="background: {colorScheme.bg}; border-left-color: {colorScheme.border};"
                         onclick={() => toggleExpanded(entrevista.id, entryIndex)}
                         role="button"
                         tabindex="0">
                      <div class="entrevista-header">
                        <div class="entrevista-fecha">
                          <Icon name="calendar" size={16} />
                          <span class="fecha">{entry.dataLabel}</span>
                          <span class="badge-curs badge-historic"
                                class:curs-actual={entrevista.es_curs_actual}
                                style="background: {colorScheme.badge};">
                            {entrevista.pestana_origen || entrevista.anyCurs}
                          </span>
                        </div>
                        <div class="entrevista-creador">
                          <span class="label">Origen:</span>
                          <span class="value">{entrevista.curso_origen || 'Històric'}</span>
                        </div>
                      </div>

                      <div class="entrevista-content">
                        <div class="acords">
                          <strong>Acords:</strong>
                          {#if expanded}
                            <!-- Mostrar contenido completo -->
                            <div class="acords-full">
                              {#each entry.paragraphs as paragraph}
                                <p>{paragraph}</p>
                              {/each}
                            </div>
                          {:else}
                            <!-- Mostrar solo snippet -->
                            <p class="acords-snippet">{entry.snippet}</p>
                          {/if}
                        </div>
                      </div>

                      <div class="expand-indicator">
                        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} />
                        <span>{expanded ? 'Veure menys' : 'Veure més'}</span>
                      </div>
                    </div>
                  {/each}
                {:else}
                  <!-- Para entrevistas normales, mostrar una sola card -->
                  <div class="entrevista-card" class:curs-passat={!entrevista.es_curs_actual}>
                    <div class="entrevista-header">
                      <div class="entrevista-fecha">
                        <span class="fecha">{formatearFechaMadridSoloFecha(entrevista.data)}</span>
                        <span class="hora">{formatearFechaMadridSoloHora(entrevista.data)}</span>
                        <span class="badge-curs" class:curs-actual={entrevista.es_curs_actual}>
                          {entrevista.anyCurs}
                        </span>
                      </div>
                      <div class="entrevista-creador">
                        <span class="label">Creada per:</span>
                        <span class="value">{entrevista.usuari_creador_id || 'Desconegut'}</span>
                      </div>
                    </div>
                    <div class="entrevista-content">
                      <div class="acords">
                        <strong>Acords:</strong>
                        <p>{entrevista.acords}</p>
                      </div>
                    </div>
                    {#if entrevista.es_curs_actual}
                      <div class="entrevista-actions">
                        <button class="btn-edit" title="Editar entrevista">
                          Editar
                        </button>
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'calendari'}
        <!-- Pestaña: Calendari -->
        <div class="calendari-section">
          <div class="section-header">
            <h2>Calendari de Cites</h2>
            <Button variant="filled" leadingIcon="plus" on:click={crearNovaCita}>Nova Cita</Button>
          </div>

          {#if showCitaForm}
            <div class="form-card">
              <h3>Nova Cita</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Data i hora:</label>
                  <input type="datetime-local" bind:value={citaForm.data_cita} />
                </div>
                <div class="form-group">
                  <label>Durada:</label>
                  <select bind:value={citaForm.durada_minuts}>
                    <option value={15}>15 minuts</option>
                    <option value={30}>30 minuts</option>
                    <option value={45}>45 minuts</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nom de la família:</label>
                  <input type="text" bind:value={citaForm.nom_familia} placeholder="Nom complet" />
                </div>
                <div class="form-group">
                  <label>Email:</label>
                  <input type="email" bind:value={citaForm.email_familia} placeholder="email@exemple.com" />
                </div>
                <div class="form-group">
                  <label>Telèfon:</label>
                  <input type="tel" bind:value={citaForm.telefon_familia} placeholder="123 456 789" />
                </div>
                <div class="form-group full-width">
                  <label>Notes:</label>
                  <textarea bind:value={citaForm.notes} placeholder="Notes addicionals"></textarea>
                </div>
              </div>
              <div class="form-actions">
                <Button variant="filled" on:click={crearCita} disabled={loadingCita}>{loadingCita ? 'Creant…' : 'Crear Cita'}</Button>
                <Button variant="outlined" on:click={() => showCitaForm = false}>Cancel·lar</Button>
              </div>
            </div>
          {/if}

          {#if loadingCites}
            <div class="loading">
              <div class="spinner"></div>
              <p>Carregant cites...</p>
            </div>
          {:else if citesCalendari.length === 0}
            <div class="empty-state">
              <div class="empty-icon">📅</div>
              <h3>No hi ha cites programades</h3>
              <p>Encara no s'han programat cites per aquest alumne.</p>
            </div>
          {:else}
            <div class="cites-list">
              {#each citesCalendari as cita}
                <div class="cita-card">
                  <div class="cita-header">
                    <div class="cita-fecha">
                      <span class="fecha">{formatearFechaMadridSoloFecha(cita.data_cita)}</span>
                      <span class="hora">{formatearFechaMadridSoloHora(cita.data_cita)}</span>
                    </div>
                    <div class="cita-durada">
                      <span class="label">Durada:</span>
                      <span class="value">{cita.durada_minuts} min</span>
                    </div>
                    <div class="cita-estat">
                      <span class="estat" style="background-color: {getEstatColor(cita.estat)}20; color: {getEstatColor(cita.estat)};">
                        {getEstatText(cita.estat)}
                      </span>
                    </div>
                  </div>
                  
                  <div class="cita-content">
                    <div class="cita-info">
                      <div class="info-item">
                        <span class="label">👨‍👩‍👧‍👦 Família:</span>
                        <span class="value">{cita.nom_familia}</span>
                      </div>
                      <div class="info-item">
                        <span class="label">📧 Email:</span>
                        <span class="value">{cita.email_familia}</span>
                      </div>
                      <div class="info-item">
                        <span class="label">📞 Telèfon:</span>
                        <span class="value">{cita.telefon_familia}</span>
                      </div>
                    </div>
                    
                    {#if cita.notes}
                      <div class="cita-notes">
                        <strong>Notes:</strong>
                        <p>{cita.notes}</p>
                      </div>
                    {/if}
                  </div>

                  {#if cita.estat === 'pendent'}
                    <div class="cita-actions">
                      <Button variant="tonal" size="sm" leadingIcon="check" on:click={() => handleConfirmarCita(cita.id)}>Confirmar Cita</Button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: #f8fafc;
    min-height: 100vh;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }

  .alumne-nom {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 15px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .alumne-details {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .detail-item {
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    backdrop-filter: blur(10px);
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  /* Pestañas */
  .tabs-container {
    margin-bottom: 30px;
  }

  .tabs {
    display: flex;
    background: white;
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    overflow-x: auto;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 24px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    color: #64748b;
    white-space: nowrap;
  }

  .tab:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .tab.active {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-text {
    font-size: 16px;
  }

  /* Contenido de pestañas */
  .tab-content {
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e2e8f0;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: #1e293b;
  }

  /* Dades del Alumne */
  .dades-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 25px;
  }

  .info-card {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  }

  .info-card.personal {
    border-left: 4px solid #3b82f6;
  }

  .info-card.documents {
    border-left: 4px solid #10b981;
  }

  .info-card.address {
    border-left: 4px solid #f59e0b;
  }

  .info-card.tutors {
    border-left: 4px solid #8b5cf6;
  }

  .card-header {
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
    border-bottom: 1px solid #e2e8f0;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1e293b;
  }

  .card-content {
    padding: 20px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .label {
    font-weight: 600;
    color: #475569;
    min-width: 120px;
  }

  .value {
    color: #1e293b;
    text-align: right;
    word-break: break-word;
  }

  .tutor-section {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .tutor-section:last-child {
    margin-bottom: 0;
  }

  .tutor-section h4 {
    margin: 0 0 15px 0;
    color: #374151;
    font-size: 1rem;
  }

  /* Entrevistes */
  .entrevistes-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .entrevista-card {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-radius: 12px;
    padding: 25px;
    border-left: 4px solid #f59e0b;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.1);
  }

  .entrevista-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .entrevista-fecha {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .fecha {
    font-size: 1.1rem;
    font-weight: 600;
    color: #92400e;
  }

  .hora {
    font-size: 0.9rem;
    color: #a16207;
  }

  .entrevista-creador {
    text-align: right;
  }

  .entrevista-creador .label {
    font-size: 0.8rem;
    color: #a16207;
  }

  .entrevista-creador .value {
    font-weight: 600;
    color: #92400e;
  }

  .acords {
    color: #92400e;
  }

  .acords p {
    margin: 10px 0 0 0;
    line-height: 1.6;
  }

  /* Badge curso */
  .badge-curs {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 8px;
    background: #94a3b8;
    color: white;
  }

  .badge-curs.curs-actual {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }

  /* Entrevista curso pasado */
  .entrevista-card.curs-passat {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    border-left-color: #94a3b8;
    opacity: 0.85;
  }

  .entrevista-card.curs-passat .fecha,
  .entrevista-card.curs-passat .hora,
  .entrevista-card.curs-passat .acords,
  .entrevista-card.curs-passat .entrevista-creador .label,
  .entrevista-card.curs-passat .entrevista-creador .value {
    color: #475569;
  }

  /* Entrevistas consolidadas (històriques) */
  .entrevista-card.entrevista-consolidada {
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 80px;
    border-left-width: 5px;
  }

  .entrevista-card.entrevista-consolidada:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .entrevista-card.entrevista-consolidada.expanded {
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
  }

  .badge-historic {
    color: white;
  }

  .entrevista-consolidada .entrevista-fecha {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .entrevista-consolidada .entrevista-fecha .fecha {
    font-weight: 600;
    font-size: 1.05rem;
    color: #1f2937;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 6px;
  }

  .acords-snippet {
    margin: 8px 0 0 0;
    color: #374151;
    font-size: 0.925rem;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .acords-full {
    margin: 8px 0 0 0;
  }

  .acords-full p {
    margin: 0 0 12px 0;
    color: #374151;
    font-size: 0.925rem;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .acords-full p:last-child {
    margin-bottom: 0;
  }

  .expand-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    color: #6b7280;
    font-size: 0.85rem;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .entrevista-card:hover .expand-indicator {
    color: #374151;
  }


  /* Entrevista actions */
  .entrevista-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
  }

  .btn-edit {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
  }

  .btn-edit:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }

  /* Calendari */
  .cites-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .cita-card {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    border-radius: 12px;
    padding: 25px;
    border-left: 4px solid #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
  }

  .cita-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
  }

  .cita-fecha {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .cita-durada {
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: center;
  }

  .cita-durada .label {
    font-size: 0.8rem;
    color: #1e40af;
  }

  .cita-durada .value {
    font-weight: 600;
    color: #1e40af;
  }

  .cita-estat {
    display: flex;
    align-items: center;
  }

  .estat {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cita-content {
    margin-bottom: 20px;
  }

  .cita-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .info-item .label {
    font-size: 0.8rem;
    color: #1e40af;
    font-weight: 600;
  }

  .info-item .value {
    color: #1e40af;
    font-weight: 500;
  }

  .cita-notes {
    background: rgba(59, 130, 246, 0.1);
    padding: 15px;
    border-radius: 8px;
    color: #1e40af;
  }

  .cita-notes p {
    margin: 10px 0 0 0;
    line-height: 1.6;
  }

  .cita-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  /* Formularios */
  .form-card {
    background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 30px;
    border-left: 4px solid #0ea5e9;
  }

  .form-card h3 {
    margin: 0 0 20px 0;
    color: #0c4a6e;
    font-size: 1.3rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-weight: 600;
    color: #0c4a6e;
    font-size: 0.9rem;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 12px;
    border: 2px solid #e0f2fe;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
    background: white;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  .form-actions {
    display: flex;
    gap: 15px;
    justify-content: flex-end;
  }

  /* Botones */
  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }

  .btn-success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
  }

  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #6b7280, #4b5563);
    color: white;
  }

  .btn-sm {
    padding: 8px 16px;
    font-size: 12px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  /* Estados */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
  }

  .empty-state {
    text-align: center;
    padding: 60px;
    color: #64748b;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    margin: 0 0 10px 0;
    color: #374151;
  }

  .empty-state p {
    margin: 0;
    font-size: 1.1rem;
  }

  /* Email links - Solo en header */
  .header .email-link {
    color: #ffffff !important;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .header .email-link:hover {
    color: #ffffff !important;
    text-decoration: underline;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .header .email-link:visited {
    color: #ffffff !important;
  }

  /* Email links - En cards (fondo blanco) */
  .card-content .email-link {
    color: #1976d2;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .card-content .email-link:hover {
    color: #1565c0;
    text-decoration: underline;
  }

  .card-content .email-link:visited {
    color: #7b1fa2;
  }

  /* Consolidated dates with popover */
  .consolidated-dates {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .date-item {
    position: relative;
    display: inline-block;
  }

  .date-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .date-badge:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }

  .acords-text {
    margin-top: 8px;
    color: #374151;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  /* Popover */
  .popover {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    padding: 12px 16px;
    min-width: 250px;
    max-width: 400px;
    z-index: 1000;
    animation: popoverFadeIn 0.2s ease-out;
  }

  .popover-arrow {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: white;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }

  .popover-content {
    position: relative;
    z-index: 1;
  }

  .popover-content strong {
    display: block;
    color: #92400e;
    margin-bottom: 6px;
    font-size: 0.9rem;
  }

  .popover-content p {
    margin: 0;
    color: #374151;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .popover-content .no-content {
    color: #9ca3af;
    font-style: italic;
  }

  @keyframes popoverFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(-8px);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 15px;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .alumne-nom {
      font-size: 2rem;
    }

    .alumne-details {
      justify-content: center;
    }

    .tabs {
      flex-direction: column;
    }

    .tab {
      justify-content: center;
    }

    .dades-grid {
      grid-template-columns: 1fr;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .cita-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .cita-info {
      grid-template-columns: 1fr;
    }
  }
</style>
