<script lang="ts">
  import { onMount } from 'svelte';
  import { alumnes } from '$lib/api/alumnes';
  import type { Alumne } from '$lib/types';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  let alumnesList: Alumne[] = [];
  let loading = true;
  let error: string | null = null;
  let searchTerm = '';
  let selectedGrup = '';
  let selectedEstat = '';
  
  $: filteredAlumnes = alumnesList.filter(alumne => {
    const matchesSearch = alumne.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrup = !selectedGrup || alumne.grup === selectedGrup;
    const matchesEstat = !selectedEstat || alumne.estat === selectedEstat;
    return matchesSearch && matchesGrup && matchesEstat;
  });
  
  $: grupsUnics = [...new Set(alumnesList.map(a => a.grup))].sort();
  
  onMount(async () => {
    try {
      alumnesList = await alumnes.list();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconegut';
    } finally {
      loading = false;
    }
  });
  
  function getEstatBadgeVariant(estat: string) {
    switch (estat) {
      case 'alta': return 'success';
      case 'baixa': return 'error';
      case 'migrat': return 'warning';
      default: return 'primary';
    }
  }
</script>

<svelte:head>
  <title>Alumnes - Sistema d'Entrevistes</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Alumnes</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Gestiona la llista d'alumnes del centre
      </p>
    </div>
    <div class="mt-4 sm:mt-0">
      <Button href="/alumnes/nou" variant="primary">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        Nou Alumne
      </Button>
    </div>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  {:else if error}
    <Card>
      <div class="text-center text-red-600 dark:text-red-400">
        <p>Error carregant els alumnes: {error}</p>
      </div>
    </Card>
  {:else}
    <!-- Filtres -->
    <Card>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cercar
          </label>
          <input
            id="search"
            type="text"
            bind:value={searchTerm}
            placeholder="Nom de l'alumne..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label for="grup" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Grup
          </label>
          <select
            id="grup"
            bind:value={selectedGrup}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Tots els grups</option>
            {#each grupsUnics as grup}
              <option value={grup}>{grup}</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label for="estat" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estat
          </label>
          <select
            id="estat"
            bind:value={selectedEstat}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Tots els estats</option>
            <option value="alta">Alta</option>
            <option value="baixa">Baixa</option>
            <option value="migrat">Migrat</option>
          </select>
        </div>
      </div>
    </Card>
    
    <!-- Llista d'alumnes -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredAlumnes as alumne}
        <Card clickable>
          <a href="/alumnes/{alumne.id}" class="block">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {alumne.nom}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Grup: {alumne.grup}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Curs: {alumne.anyCurs}
                </p>
              </div>
              <Badge variant={getEstatBadgeVariant(alumne.estat)}>
                {alumne.estat}
              </Badge>
            </div>
          </a>
        </Card>
      {/each}
    </div>
    
    {#if filteredAlumnes.length === 0}
      <Card>
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Cap alumne trobat</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedGrup || selectedEstat 
              ? 'Prova a canviar els filtres de cerca'
              : 'No hi ha alumnes registrats al sistema'}
          </p>
        </div>
      </Card>
    {/if}
  {/if}
</div>
