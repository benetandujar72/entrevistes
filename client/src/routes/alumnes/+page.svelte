<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAlumnesDb, type Alumne, loadConfigSpreadsheets, setSelectedCourse, getSelectedCourse } from '$lib';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import Button from '$lib/components/Button.svelte';

  let alumnes: Alumne[] = [];
  let q = '';
  let grup = '';
  let loading = true;
  let error: string | null = null;
  let count = 0;
  let filtered: Alumne[] = [];

  let selected: string = '';
  let selectedValue: string = ''; // Variable para el binding del selector
  let cfg = loadConfigSpreadsheets();
  let anyCurs = '';

  onMount(async () => { 
    selected = getSelectedCourse(); 
    selectedValue = selected || '';
    console.log('🚀 onMount - selected inicial:', selected);
    console.log('🚀 onMount - selectedValue inicial:', selectedValue);
    await load(); 
  });
  async function load() {
    try {
      loading = true; error = null;
      const params = anyCurs ? { anyCurs } : undefined;
      alumnes = await fetchAlumnesDb(params);
      count = alumnes.length;
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  }

  // Función para manejar cambios en el selector de curso
  function handleCourseChange(value: string) {
    selected = value;
    selectedValue = value;
    setSelectedCourse(value);
  }

  // Función de filtrado reactiva que se ejecuta automáticamente
  $: filtered = (() => {
    if (alumnes.length === 0) {
      return [];
    }
    
    const filteredResult = alumnes.filter(a => {
      // Filtro por nombre
      const nombreMatch = !q || a.nom.toLowerCase().includes(q.toLowerCase());
      
      // Filtro por grupo
      const grupoMatch = !grup || (a.grup || '').toLowerCase().includes(grup.toLowerCase());
      
      // Filtro por curso
      let cursoMatch = true;
      if (selected && selected !== '') {
        // Mapeo correcto: curso -> prefijo de grupo
        const cursoMapping = {
          '1r': '1',  // 1r ESO -> grupos 1A, 1B, 1C
          '2n': '2',  // 2n ESO -> grupos 2A, 2B, 2C  
          '3r': '3',  // 3r ESO -> grupos 3A, 3B, 3C
          '4t': '4'   // 4t ESO -> grupos 4A, 4B, 4C
        };
        
        const cursoPrefix = cursoMapping[selected];
        if (cursoPrefix) {
          const alumneGrup = (a.grup || '').toLowerCase();
          // El grupo debe empezar con el prefijo del curso
          cursoMatch = alumneGrup.startsWith(cursoPrefix);
        }
      }
      
      return nombreMatch && grupoMatch && cursoMatch;
    });
    
    return filteredResult;
  })()
</script>

<FilterBar 
  title="Alumnes"
  {count}
  {loading}
  filters={{
             any: { 
               value: anyCurs, 
               placeholder: "2025-2026",
               onChange: (value) => { 
                 anyCurs = value; 
                 load(); 
               }
             },
             curs: { 
               value: selectedValue, 
               options: [
                 { value: "1r", label: "1r ESO" },
                 { value: "2n", label: "2n ESO" },
                 { value: "3r", label: "3r ESO" },
                 { value: "4t", label: "4t ESO" }
               ],
               onChange: handleCourseChange
             },
             grup: { 
               value: grup, 
               placeholder: "Ex: 1A, 1B, 2C...",
               onChange: (value) => { 
                 grup = value; 
               }
             },
             search: { 
               value: q, 
               placeholder: "Nom de l'alumne...",
               onChange: (value) => { 
                 q = value; 
               }
             }
  }}
/>

{#if loading}
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
    {#each Array(6) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px; margin-bottom:6px;"></div>
        <div style="height:10px; width:50%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if filtered.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M6 9h8M6 13h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div style="font-weight:600;">Sense alumnes</div>
      <div style="font-size:14px;">Tria un curs o revisa la configuració d'IDs a Config.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
      {#each filtered as a}
        <article style="border:1px solid var(--border); background:var(--card-bg); border-radius:16px; padding:16px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:8px;">
          <strong style="font-size:14px; color:#111827;">{a.nom}</strong>
          <div style="font-size:13px; color:#111827;">Grup: <span style="color:#374151;">{a.grup || '—'}</span></div>
          <div style="font-size:13px; color:#111827;">Curs: <span style="color:#374151;">{a.anyCurs || '—'}</span> · Estat: <span style="color:#374151;">{a.estat || '—'}</span></div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <a class="btn btn-filled-primary btn-sm" href={`/alumnes/${a.id}`}>Obrir fitxa</a>
            <a class="btn btn-tonal-primary btn-sm" href={`/entrevistes/nova?alumne=${a.id}&nom=${encodeURIComponent(a.nom)}&grup=${encodeURIComponent(a.grup || '')}&curs=${encodeURIComponent(a.anyCurs || '')}`}>Nova entrevista</a>
          </div>
        </article>
      {/each}
    </div>
  {/if}
{/if}


