<script lang="ts">
  import { onMount } from 'svelte';
  import { obtenerListaTutores, obtenerAlumnesTutor, type Tutor, type AlumneTutor } from '$lib';
  import { toastError } from '$lib/toast';

  let tutores: Tutor[] = [];
  let tutorSeleccionado = '';
  let alumnesTutor: AlumneTutor[] = [];
  let loading = true;
  let cargandoAlumnes = false;
  let error: string | null = null;

  onMount(async () => {
    await cargarTutores();
  });

  async function cargarTutores() {
    loading = true;
    error = null;
    try {
      tutores = await obtenerListaTutores();
      if (tutores.length > 0) {
        tutorSeleccionado = tutores[0].tutor_email;
        await cargarAlumnesTutor();
      }
    } catch (e: any) {
      error = e?.message || 'Error carregant tutors';
    } finally {
      loading = false;
    }
  }

  async function cargarAlumnesTutor() {
    if (!tutorSeleccionado) return;
    
    cargandoAlumnes = true;
    try {
      alumnesTutor = await obtenerAlumnesTutor(tutorSeleccionado);
    } catch (e: any) {
      error = e?.message || 'Error carregant alumnes del tutor';
    } finally {
      cargandoAlumnes = false;
    }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Tutores i Alumnes</h1>
  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
    <select bind:value={tutorSeleccionado} onchange={cargarAlumnesTutor} style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px;">
      {#each tutores as tutor}
        <option value={tutor.tutor_email}>{tutor.tutor_email} ({tutor.total_alumnes} alumnes)</option>
      {/each}
    </select>
  </div>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
  {#if error}
    <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
  {/if}
</section>

{#if loading}
  <div>Carregant tutors...</div>
{:else if tutores.length === 0}
  <div style="padding:20px; text-align:center; color:#6b7280;">
    No hi ha tutors assignats. Importa un CSV de tutories per veure els tutors i els seus alumnes.
  </div>
{:else}
  <!-- Lista de tutores -->
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:20px;">
    <h3 style="margin:0 0 16px 0; font-size:16px; color:#1e293b;">Llista de Tutors</h3>
    
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px;">
      {#each tutores as tutor}
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; display:flex; align-items:center; gap:12px;">
          <div style="flex:1;">
            <div style="font-weight:600; color:#1e293b; margin-bottom:4px;">{tutor.tutor_email}</div>
            <div style="font-size:14px; color:#6b7280;">{tutor.total_alumnes} alumnes assignats</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Información del tutor seleccionado -->
  {#if tutorSeleccionado}
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:20px;">
      <h2 style="margin:0 0 8px 0; font-size:18px; color:#1e293b;">Tutor Seleccionat: {tutorSeleccionado}</h2>
      <div style="font-size:14px; color:#6b7280;">
        <strong>Total alumnes assignats:</strong> {alumnesTutor.length}
      </div>
    </div>

    <!-- Lista de alumnos del tutor seleccionado -->
    {#if cargandoAlumnes}
      <div>Carregant alumnes del tutor...</div>
    {:else if alumnesTutor.length === 0}
      <div style="padding:20px; text-align:center; color:#6b7280;">
        El tutor seleccionat no té alumnes assignats.
      </div>
    {:else}
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
        <h3 style="margin:0 0 16px 0; font-size:16px; color:#1e293b;">Alumnes Assignats</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;">
          {#each alumnesTutor as alumne}
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <h4 style="margin:0; font-size:16px; color:#1e293b;">{alumne.nom}</h4>
                <span style="font-size:12px; color:#059669; background:#ecfdf5; border:1px solid #d1fae5; padding:2px 8px; border-radius:999px;">
                  {alumne.total_entrevistes} entrevistes
                </span>
              </div>
              
              <div style="font-size:14px; color:#6b7280; margin-bottom:8px;">
                <div><strong>Grup:</strong> {alumne.grup_nom}</div>
                <div><strong>Curs:</strong> {alumne.curs}</div>
                {#if alumne.email}
                  <div><strong>Email:</strong> 
                    <a href="mailto:{alumne.email}" style="color:#2563eb; text-decoration:none;">
                      {alumne.email}
                    </a>
                  </div>
                {/if}
              </div>
              
              <div style="display:flex; gap:8px; margin-top:12px;">
                <a href="/alumnes/{alumne.id}" style="font-size:12px; padding:6px 12px; border:1px solid #2563eb; background:#2563eb; color:#fff; border-radius:6px; text-decoration:none;">
                  Veure Fitxa
                </a>
                <a href="/entrevistes/nova?alumne={alumne.id}&nom={encodeURIComponent(alumne.nom)}&grup={encodeURIComponent(alumne.grup_nom)}&curs={encodeURIComponent(alumne.any_curs)}" style="font-size:12px; padding:6px 12px; border:1px solid #059669; background:#059669; color:#fff; border-radius:6px; text-decoration:none;">
                  Nova Entrevista
                </a>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
{/if}

