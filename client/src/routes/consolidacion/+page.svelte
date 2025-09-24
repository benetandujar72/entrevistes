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

<div class="p-6 max-w-6xl mx-auto">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Consolidació d'Entrevistes</h1>
    <p class="text-gray-600">
      Consolida automàticament les entrevistes d'un curs basant-se en l'historial de pestanyes anteriors.
    </p>
  </div>

  <!-- Selecció de Curs i Consolidació -->
  <div class="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 class="text-xl font-semibold mb-4">Consolidar Curs</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label for="curs" class="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Curs
        </label>
        <select 
          id="curs"
          bind:value={cursSeleccionat}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecciona un curs...</option>
          {#each cursos as curs}
            <option value={curs.nom}>{curs.nom}</option>
          {/each}
        </select>
      </div>
      
      <div class="flex items-end">
        <button
          on:click={consolidar}
          disabled={!cursSeleccionat || consolidant}
          class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {consolidant ? 'Consolidant...' : 'Consolidar Curs'}
        </button>
      </div>
    </div>

    {#if resultat}
      <div class="mt-4 p-4 rounded-md {resultat.exit ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
        <h3 class="font-semibold {resultat.exit ? 'text-green-800' : 'text-red-800'}">
          {resultat.exit ? 'Consolidació Exitosa' : 'Error en Consolidació'}
        </h3>
        <p class="mt-2 {resultat.exit ? 'text-green-700' : 'text-red-700'}">
          {resultat.detalls}
        </p>
        {#if resultat.exit}
          <div class="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium">Alumnes:</span> {resultat.alumnesProcessats}
            </div>
            <div>
              <span class="font-medium">Entrevistes:</span> {resultat.entrevistesImportades}
            </div>
            <div>
              <span class="font-medium">Errors:</span> {resultat.errors}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Botons d'Acció -->
  <div class="flex gap-4 mb-6">
    <button
      on:click={() => { mostrarLogs = !mostrarLogs; mostrarEntrevistes = false; }}
      class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
    >
      {mostrarLogs ? 'Ocultar' : 'Veure'} Logs de Consolidació
    </button>
    
    {#if cursSeleccionat}
      <button
        on:click={() => { carregarEntrevistes(); mostrarLogs = false; }}
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
      >
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
