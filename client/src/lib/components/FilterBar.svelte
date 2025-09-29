<script lang="ts">
  import TextField from './TextField.svelte';
  import Icon from './SimpleIcon.svelte';

  interface FilterOption {
    value: string;
    label: string;
  }

  interface Props {
    title?: string;
    count?: number;
    loading?: boolean;
    filters?: {
      any?: { value: string; placeholder?: string; onChange?: (value: string) => void };
      curs?: { value: string; options: FilterOption[]; onChange?: (value: string) => void };
      grup?: { value: string; placeholder?: string; onChange?: (value: string) => void };
      search?: { value: string; placeholder?: string; onChange?: (value: string) => void };
    };
  }

  let { 
    title = 'Filtros', 
    count, 
    loading = false,
    filters = {}
  }: Props = $props();
</script>

<div class="filter-bar">
  <div class="header">
    <h1 class="title">
      {#if title}
        {title}
        {#if !loading && count !== undefined}
          <span class="count">({count})</span>
        {/if}
      {/if}
    </h1>
  </div>
  
  <div class="filters-container">
    <div class="filters-row">
      {#if filters.any}
        <div class="filter-field">
          <TextField 
            label="Any" 
            value={filters.any.value}
            oninput={(e: any) => { if (filters.any?.onChange) filters.any.onChange(e.target.value); }}
            placeholder={filters.any.placeholder || "2025-2026"}
          />
        </div>
      {/if}
      
      {#if filters.curs}
        <div class="filter-field">
          <label for="curs-select" class="filter-label">Curs</label>
          <select 
            id="curs-select"
            bind:value={filters.curs.value}
            onchange={(e: any) => {
              console.log('🎯 FilterBar - onchange ejecutado:', e.target.value);
              console.log('🎯 FilterBar - filters.curs?.onChange existe:', !!filters.curs?.onChange);
              if (filters.curs?.onChange) {
                console.log('🎯 FilterBar - Llamando a onChange con:', e.target.value);
                filters.curs.onChange(e.target.value);
                console.log('🎯 FilterBar - onChange completado');
              } else {
                console.log('🎯 FilterBar - onChange no existe');
              }
            }}
            class="filter-select"
          >
            <option value="">(sense selecció)</option>
            {#each filters.curs.options as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      {#if filters.grup}
        <div class="filter-field">
          <TextField 
            label="Grup" 
            value={filters.grup.value}
            oninput={(e: any) => { if (filters.grup?.onChange) filters.grup.onChange(e.target.value); }}
            placeholder={filters.grup.placeholder || "Ex: 1A, 1B, 2C..."}
          />
        </div>
      {/if}
      
      {#if filters.search}
        <div class="filter-field search-field">
          <TextField 
            label="Cercar" 
            value={filters.search.value}
            oninput={(e: any) => { if (filters.search?.onChange) filters.search.onChange(e.target.value); }}
            placeholder={filters.search.placeholder || "Nom de l'alumne..."}
            leadingIcon="search"
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .filter-bar {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem 1.5rem 2rem 1.5rem; /* Más padding inferior */
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-sm);
  }

  .header {
    margin-bottom: 1rem;
  }

  .title {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .count {
    font-size: var(--text-sm);
    color: var(--fg-secondary);
    font-weight: 400;
  }

  .filters-container {
    width: 100%;
  }

  .filters-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem; /* Más espacio entre campos */
    align-items: start; /* Alinear al inicio para evitar problemas de altura */
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    min-width: 0; /* Permite que el campo se contraiga */
    min-height: 90px; /* Altura mínima aumentada para evitar solapamiento */
    gap: 0.5rem; /* Espacio entre elementos del campo */
  }

  .filter-field.search-field {
    grid-column: 1 / -1; /* El campo de búsqueda ocupa todo el ancho */
  }

  .filter-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg-secondary);
    margin-bottom: 0.5rem; /* Espacio reducido pero suficiente */
    display: block;
    line-height: 1.2;
    white-space: nowrap; /* Evita que el texto se corte */
  }

  .filter-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-lg);
    background: var(--input-bg);
    color: var(--fg);
    font-size: var(--text-sm);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .filter-select:hover {
    border-color: var(--border-hover);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .filters-row {
      grid-template-columns: 1fr;
      gap: 1rem; /* Mantener espacio adecuado en móvil */
    }
    
    .filter-field.search-field {
      grid-column: 1;
    }
    
    .filter-field {
      min-height: 80px; /* Altura mínima ajustada en móvil */
    }
    
    .filter-bar {
      padding: 1rem 1rem 1.5rem 1rem; /* Padding ajustado para móvil */
    }
  }

  @media (max-width: 480px) {
    .filter-bar {
      padding: 0.75rem;
    }
    
    .title {
      font-size: var(--text-lg);
    }
  }
</style>
