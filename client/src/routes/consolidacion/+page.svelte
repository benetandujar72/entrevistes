<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    fetchCursosDisponibles, 
    consolidarCurs, 
    fetchConsolidacionLogs, 
    fetchEntrevistesConsolidadas,
    type CursDisponible,
    type ConsolidacionResult,
    type ConsolidacionLog,
    type EntrevistaConsolidada
  } from '$lib/index.js';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let cursos: CursDisponible[] = [];
  let cursSeleccionat = '';
  let consolidant = false;
  let resultat: ConsolidacionResult | null = null;
  let logs: ConsolidacionLog[] = [];
  let entrevistes: EntrevistaConsolidada[] = [];
  let mostrarLogs = false;
  let mostrarEntrevistes = false;

  onMount(async () => {
    await carregarCursos();
    await carregarLogs();
  });

  async function carregarCursos() {
    try {
      cursos = await fetchCursosDisponibles();
    } catch (error) {
      console.error('Error carregant cursos:', error);
    }
  }

  async function carregarLogs() {
    try {
      logs = await fetchConsolidacionLogs();
    } catch (error) {
      console.error('Error carregant logs:', error);
    }
  }

  async function consolidar() {
    if (!cursSeleccionat) {
      alert('Selecciona un curs per consolidar');
      return;
    }

    consolidant = true;
    resultat = null;

    try {
      resultat = await consolidarCurs(cursSeleccionat);
      await carregarLogs();
      
      if (resultat.exit) {
        alert(`Consolidació completada!\n\n${resultat.detalls}`);
      } else {
        alert(`Error en la consolidació:\n\n${resultat.detalls}`);
      }
    } catch (error) {
      console.error('Error consolidant:', error);
      alert('Error consolidant curs: ' + (error as Error).message);
    } finally {
      consolidant = false;
    }
  }

  async function carregarEntrevistes() {
    if (!cursSeleccionat) return;
    
    try {
      entrevistes = await fetchEntrevistesConsolidadas(cursSeleccionat);
      mostrarEntrevistes = true;
    } catch (error) {
      console.error('Error carregant entrevistes:', error);
    }
  }

  function formatearData(data: string) {
    return new Date(data).toLocaleString('ca-ES');
  }

  function getEstatColor(estat: string) {
    switch (estat) {
      case 'completat': return 'text-green-600 bg-green-100';
      case 'processant': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
</script>

<div class="page-container">
  <div class="page-header">
    <h1 class="page-title">
      <Icon name="download" size={28} />
      Consolidació d'Entrevistes
    </h1>
    <p class="page-description">
      Consolida automàticament les entrevistes d'un curs basant-se en l'historial de pestanyes anteriors.
    </p>
  </div>

  <!-- Selecció de Curs i Consolidació -->
  <div class="card">
    <div class="card-header">
      <Icon name="settings" size={20} />
      <h2>Consolidar Curs</h2>
    </div>
    
    <div class="form-grid">
      <div class="form-group">
        <label for="curs">Seleccionar Curs</label>
        <select 
          id="curs"
          name="curs"
          bind:value={cursSeleccionat}
          class="select"
        >
          <option value="">Selecciona un curs...</option>
          {#each cursos as curs}
            <option value={curs.nom}>{curs.nom}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <button
          onclick={consolidar}
          disabled={!cursSeleccionat || consolidant}
          class="btn btn-filled-primary btn-full"
        >
          {#if consolidant}
            <span class="btn-spinner"></span>
          {:else}
            <Icon name="download" size={16} />
          {/if}
          {consolidant ? 'Consolidant...' : 'Consolidar Curs'}
        </button>
      </div>
    </div>

    {#if resultat}
      <div class="result-card {resultat.exit ? 'result-success' : 'result-error'}">
        <div class="result-header">
          <Icon name={resultat.exit ? 'check-circle' : 'alert-circle'} size={20} />
          <h3>{resultat.exit ? 'Consolidació Exitosa' : 'Error en Consolidació'}</h3>
        </div>
        <p class="result-message">{resultat.detalls}</p>
        {#if resultat.exit}
          <div class="result-stats">
            <div class="stat">
              <span class="stat-label">Alumnes:</span>
              <span class="stat-value">{resultat.alumnesProcessats}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Entrevistes:</span>
              <span class="stat-value">{resultat.entrevistesImportades}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Errors:</span>
              <span class="stat-value">{resultat.errors}</span>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Botons d'Acció -->
  <div class="action-buttons">
    <button
      onclick={() => { mostrarLogs = !mostrarLogs; mostrarEntrevistes = false; }}
      class="btn btn-tonal-primary"
    >
      <Icon name="notes" size={16} />
      {mostrarLogs ? 'Ocultar' : 'Veure'} Logs de Consolidació
    </button>
    
    {#if cursSeleccionat}
      <button
        onclick={() => { carregarEntrevistes(); mostrarLogs = false; }}
        class="btn btn-filled-primary"
      >
        <Icon name="users" size={16} />
        Veure Entrevistes Consolidadas
      </button>
    {/if}
  </div>

  <!-- Logs de Consolidació -->
  {#if mostrarLogs}
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Logs de Consolidació</h2>
      
      {#if logs.length === 0}
        <p class="text-gray-500">No hi ha logs de consolidació disponibles.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curs</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estat</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumnes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrevistes</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each logs as log}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.cursNom}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getEstatColor(log.estat)}">
                      {log.estat}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.alumnesProcessats}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.entrevistesImportades}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearData(log.creatAt)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Entrevistes Consolidadas -->
  {#if mostrarEntrevistes}
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Entrevistes Consolidadas - {cursSeleccionat}</h2>
      
      {#if entrevistes.length === 0}
        <p class="text-gray-500">No hi ha entrevistes consolidadas per a aquest curs.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumne</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pestanya Origen</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acords</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each entrevistes as entrevista}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entrevista.alumneNom}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entrevista.pestanyaOrigen}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatearData(entrevista.dataEntrevista)}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div class="truncate" title={entrevista.acords}>
                      {entrevista.acords}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* === PAGE CONTAINER === */
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* === PAGE HEADER === */
  .page-header {
    margin-bottom: 2rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: var(--text-3xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0 0 0.5rem 0;
  }

  .page-description {
    font-size: var(--text-lg);
    color: var(--fg-secondary);
    margin: 0;
  }

  /* === CARDS === */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--card-shadow);
    margin-bottom: 1.5rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--fg);
  }

  /* === FORM GRID === */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: end;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg-secondary);
  }

  /* === SELECT === */
  .select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--input-bg);
    color: var(--fg);
    transition: all 0.2s ease;
    min-width: 200px;
  }

  .select:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  /* === BUTTON FULL === */
  .btn-full {
    width: 100%;
  }

  /* === RESULT CARD === */
  .result-card {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid;
  }

  .result-success {
    background: var(--success-50);
    border-color: var(--success-500);
    color: var(--success-600);
  }

  .result-error {
    background: var(--error-50);
    border-color: var(--error-500);
    color: var(--error-600);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .result-header h3 {
    font-weight: 600;
    font-size: var(--text-lg);
    margin: 0;
  }

  .result-message {
    margin: 0 0 1rem 0;
    font-size: var(--text-sm);
  }

  .result-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: var(--text-xs);
    font-weight: 500;
    opacity: 0.8;
  }

  .stat-value {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  /* === ACTION BUTTONS === */
  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .result-stats {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }
  }
</style>
