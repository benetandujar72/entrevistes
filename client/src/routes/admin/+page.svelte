<script lang="ts">
  import { onMount } from 'svelte';
  import { toastSuccess, toastError } from '$lib/toast';

  let initializing = false;
  let message = '';

  async function initializeCourse() {
    if (!confirm('Atenció: Això eliminarà TOTES les dades de la base de dades excepte els usuaris. Vols continuar?')) {
      return;
    }

    try {
      initializing = true;
      message = 'Inicialitzant curs...';
      
      const response = await fetch('http://localhost:8081/admin/initialize-course-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error inicialitzant curs');
      }

      message = 'Curs inicialitzat correctament';
      toastSuccess('Curs inicialitzat correctament');
      
    } catch (error: any) {
      message = `Error: ${error.message}`;
      toastError(error.message);
    } finally {
      initializing = false;
    }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Administració</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

<div style="display:grid; gap:16px; max-width:600px;">
  
  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:20px; background:#fff;">
    <h2 style="margin:0 0 12px; font-size:18px; color:#111827;">Inicialització del Curs</h2>
    <p style="margin:0 0 16px; color:#6b7280; font-size:14px; line-height:1.5;">
      Aquesta acció eliminarà totes les dades de la base de dades excepte els usuaris. 
      Ús-la quan vulguis començar un curs nou des de zero.
    </p>
    
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
      <button 
        onclick={initializeCourse} 
        disabled={initializing}
        style="
          padding:10px 16px; 
          border:1px solid #dc2626; 
          background:#dc2626; 
          color:#fff; 
          border-radius:8px; 
          cursor:pointer;
          font-size:14px;
          font-weight:500;
          transition:all 0.2s;
        "
        onmouseenter={(e) => e.currentTarget.style.background='#b91c1c'}
        onmouseleave={(e) => e.currentTarget.style.background='#dc2626'}
      >
        {initializing ? 'Inicialitzant...' : 'Inicialitzar Curs'}
      </button>
      
      {#if message}
        <div style="
          padding:8px 12px; 
          border-radius:6px; 
          font-size:13px;
          {message.includes('Error') ? 
            'background:#fef2f2; color:#dc2626; border:1px solid #fecaca;' : 
            'background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;'
          }
        ">
          {message}
        </div>
      {/if}
    </div>
  </div>

  <div style="border:1px solid #e5e7eb; border-radius:12px; padding:20px; background:#fff;">
    <h2 style="margin:0 0 12px; font-size:18px; color:#111827;">Accions Ràpides</h2>
    <div style="display:grid; gap:8px;">
      <a href="/admin/usuaris" style="
        display:block; 
        padding:12px 16px; 
        border:1px solid #e5e7eb; 
        border-radius:8px; 
        text-decoration:none; 
        color:#111827;
        background:#f9fafb;
        transition:all 0.2s;
      " onmouseenter={(e) => e.currentTarget.style.background='#f3f4f6'} onmouseleave={(e) => e.currentTarget.style.background='#f9fafb'}>
        👥 Gestionar Usuaris
      </a>
      <a href="/admin/assignacions" style="
        display:block;
        padding:12px 16px;
        border:1px solid #e5e7eb;
        border-radius:8px;
        text-decoration:none;
        color:#111827;
        background:#f9fafb;
        transition:all 0.2s;
      " onmouseenter={(e) => e.currentTarget.style.background='#f3f4f6'} onmouseleave={(e) => e.currentTarget.style.background='#f9fafb'}>
        📋 Gestionar Assignacions
      </a>
      <a href="/admin/tutories" style="
        display:block;
        padding:12px 16px;
        border:1px solid #e5e7eb;
        border-radius:8px;
        text-decoration:none;
        color:#111827;
        background:#f9fafb;
        transition:all 0.2s;
      " onmouseenter={(e) => e.currentTarget.style.background='#f3f4f6'} onmouseleave={(e) => e.currentTarget.style.background='#f9fafb'}>
        🎓 Gestionar Tutorías
      </a>
    </div>
  </div>

</div>
