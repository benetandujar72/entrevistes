<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnesDb, fetchHealth, type Alumne } from '$lib';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let health = '';
  let total = 0;
  let actius = 0;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      const [h, alumnes] = await Promise.all([fetchHealth(), fetchAlumnesDb()]);
      health = h.status;
      total = alumnes.length;
      actius = alumnes.filter(a => a.estat === 'alta').length;
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });
</script>

<div class="dashboard-page">
  <!-- Header -->
  <div class="dashboard-header">
    <div class="header-content">
      <div class="header-title">
        <Icon name="dashboard" size={24} />
        <h1>Dashboard</h1>
      </div>
      <p class="header-subtitle">Resumen del sistema de entrevistas</p>
    </div>
  </div>

  <!-- Contenido -->
  <div class="dashboard-content">
    {#if loading}
      <div class="stats-grid">
        {#each Array(3) as _}
          <div class="stat-card loading">
            <div class="stat-skeleton">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-value"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if error}
      <div class="error-card">
        <div class="error-content">
          <Icon name="alert-circle" size={20} />
          <span>{error}</span>
        </div>
      </div>
    {:else}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon api">
              <Icon name="check-circle" size={20} />
            </div>
            <div class="stat-info">
              <div class="stat-label">API Status</div>
              <div class="stat-value">{health}</div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon students">
              <Icon name="users" size={20} />
            </div>
            <div class="stat-info">
              <div class="stat-label">Total Alumnes</div>
              <div class="stat-value">{total}</div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon active">
              <Icon name="check-circle" size={20} />
            </div>
            <div class="stat-info">
              <div class="stat-label">Alumnes Actius</div>
              <div class="stat-value">{actius}</div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @import '$lib/design-system.css';
  
  .dashboard-page {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .dashboard-header {
    margin-bottom: 2rem;
  }
  
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .header-title h1 {
    margin: 0;
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--fg);
  }
  
  .header-subtitle {
    margin: 0;
    color: var(--fg-secondary);
    font-size: var(--text-base);
  }
  
  .dashboard-content {
    margin-bottom: 2rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .stat-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
  }
  
  .stat-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .stat-icon {
    width: 3rem;
    height: 3rem;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
  }
  
  .stat-icon.api {
    background: linear-gradient(135deg, var(--success-500), var(--success-600));
  }
  
  .stat-icon.students {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  }
  
  .stat-icon.active {
    background: linear-gradient(135deg, var(--warning-500), var(--warning-600));
  }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-label {
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    margin-bottom: 0.25rem;
    font-weight: 500;
  }
  
  .stat-value {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--fg);
  }
  
  /* Skeleton Loading */
  .stat-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .skeleton-line {
    background: linear-gradient(90deg, var(--slate-200) 25%, var(--slate-100) 50%, var(--slate-200) 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: var(--radius-sm);
  }
  
  .skeleton-title {
    height: 0.875rem;
    width: 60%;
  }
  
  .skeleton-value {
    height: 1.5rem;
    width: 40%;
  }
  
  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  /* Error State */
  .error-card {
    border-color: var(--error-500);
    background: var(--error-50);
  }
  
  .error-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--error-600);
    font-weight: 500;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .header-title h1 {
      font-size: var(--text-2xl);
    }
  }
</style>


