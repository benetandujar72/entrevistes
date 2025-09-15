<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import { page } from '$app/stores';
  
  let darkMode = false;
  let mobileMenuOpen = false;
  
  onMount(() => {
    // Inicialitzar autenticació
    authStore.initialize();
    
    // Inicialitzar mode fosc
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      darkMode = true;
      document.documentElement.classList.add('dark');
    }
    
    // Inicialitzar Google Identity Services
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }
  });
  
  function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
  
  function handleCredentialResponse(response: any) {
    // Aquí processaríem la resposta de Google
    console.log('Google login response:', response);
    // TODO: Enviar token al backend per verificar
  }
  
  function loginWithGoogle() {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  }
  
  function logout() {
    authStore.logout();
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
</script>

<svelte:head>
  <title>Sistema d'Entrevistes - INS Bitacola</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Navigation -->
  <nav class="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">E</span>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-white">Entrevistes</span>
          </a>
        </div>
        
        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a href="/dashboard" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Dashboard
          </a>
          <a href="/alumnes" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Alumnes
          </a>
          <a href="/entrevistes" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Entrevistes
          </a>
          <a href="/cursos" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Cursos
          </a>
          <a href="/pf" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            PF
          </a>
          <a href="/tutor" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Tutor
          </a>
          
          <!-- Dark Mode Toggle -->
          <button
            on:click={toggleDarkMode}
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {#if darkMode}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
              </svg>
            {/if}
          </button>
        </div>
        
        <!-- Mobile menu button -->
        <div class="md:hidden flex items-center">
          <button
            on:click={() => mobileMenuOpen = !mobileMenuOpen}
            class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mobile Navigation -->
    {#if mobileMenuOpen}
      <div class="md:hidden border-t border-gray-200 dark:border-gray-700">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <a href="/dashboard" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            Dashboard
          </a>
          <a href="/alumnes" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            Alumnes
          </a>
          <a href="/entrevistes" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            Entrevistes
          </a>
          <a href="/cursos" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            Cursos
          </a>
          <a href="/pf" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            PF
          </a>
          <a href="/tutor" class="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
            Tutor
          </a>
        </div>
      </div>
    {/if}
  </nav>
  
  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>
</div>

<!-- Google Identity Services Script -->
<script>
  // Declarar window.google per TypeScript
  declare global {
    interface Window {
      google: any;
    }
  }
</script>
