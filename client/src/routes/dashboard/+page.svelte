<script lang="ts">
  import { onMount } from 'svelte';
  import { alumnes } from '$lib/api/alumnes';
  import { entrevistes } from '$lib/api/entrevistes';
  import { cursos } from '$lib/api/cursos';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  let stats = {
    totalAlumnes: 0,
    totalEntrevistes: 0,
    totalCursos: 0,
    alumnesActius: 0,
  };
  
  let loading = true;
  let error: string | null = null;
  
  onMount(async () => {
    try {
      const [alumnesData, entrevistesData, cursosData] = await Promise.all([
        alumnes.list(),
        entrevistes.list(),
        cursos.list(),
      ]);
      
      stats = {
        totalAlumnes: alumnesData.length,
        totalEntrevistes: entrevistesData.length,
        totalCursos: cursosData.length,
        alumnesActius: alumnesData.filter(a => a.estat === 'alta').length,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconegut';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - Sistema d'Entrevistes</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Visió general del sistema d'entrevistes
    </p>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  {:else if error}
    <Card>
      <div class="text-center text-red-600 dark:text-red-400">
        <p>Error carregant les dades: {error}</p>
      </div>
    </Card>
  {:else}
    <!-- Estadístiques -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Alumnes</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalAlumnes}</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Alumnes Actius</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{stats.alumnesActius}</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Entrevistes</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalEntrevistes}</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Cursos</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalCursos}</p>
          </div>
        </div>
      </Card>
    </div>
    
    <!-- Accions ràpides -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card clickable>
        <a href="/alumnes" class="block">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Gestionar Alumnes</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Veure i editar alumnes</p>
            </div>
          </div>
        </a>
      </Card>
      
      <Card clickable>
        <a href="/entrevistes" class="block">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Gestionar Entrevistes</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Crear i editar entrevistes</p>
            </div>
          </div>
        </a>
      </Card>
      
      <Card clickable>
        <a href="/pf" class="block">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Personal Familiar</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Gestionar dades familiars</p>
            </div>
          </div>
        </a>
      </Card>
    </div>
  {/if}
</div>
