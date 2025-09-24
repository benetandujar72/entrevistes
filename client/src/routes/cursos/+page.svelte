<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCursos, obtenerMisAlumnes, type Curs, type AlumneTutor, getMe } from '$lib';

  let cursos: Curs[] = [];
  let misAlumnes: AlumneTutor[] = [];
  let loading = true;
  let loadingAlumnes = false;
  let error: string | null = null;
  let user = getMe();

  onMount(async () => {
    try {
      cursos = await fetchCursos();
      // Si es tutor, cargar sus alumnos
      if (user?.role === 'docent') {
        await cargarMisAlumnes();
      }
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });

  async function cargarMisAlumnes() {
    loadingAlumnes = true;
    try {
      misAlumnes = await obtenerMisAlumnes();
    } catch (e: any) {
      error = e?.message ?? 'Error carregant alumnes';
    } finally {
      loadingAlumnes = false;
    }
  }
</script>

<section style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
  <h1 style="margin:0; font-size:22px;">Cursos</h1>
  <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
</section>

{#if loading}
  <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
    {#each Array(4) as _}
      <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
        <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
        <div style="height:10px; width:80%; background:#eceef3; border-radius:6px;"></div>
      </div>
    {/each}
  </div>
{:else if error}
  <div style="padding:14px; border:1px solid #fee2e2; background:#fff1f2; color:#b91c1c; border-radius:12px;">{error}</div>
{:else}
  {#if cursos.length === 0}
    <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
        <path d="M12 3L2 8l10 5 10-5-10-5Z" fill="currentColor"/>
      </svg>
      <div style="font-weight:600;">Sense cursos</div>
      <div style="font-size:14px;">Revisa la configuració o importa dades a la BD.</div>
    </div>
  {:else}
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
      {#each cursos as c}
        <article style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 10px 28px rgba(37,99,235,0.06); display:flex; flex-direction:column; gap:8px;">
          <strong style="font-size:14px; color:#111827;">{c.any}</strong>
          <div style="font-size:13px; color:#111827;">Grups: <span style="color:#374151;">{c.grups?.join(', ') || '—'}</span></div>
        </article>
      {/each}
    </div>
  {/if}
{/if}

<!-- Sección para tutores: mostrar sus alumnos -->
{#if user?.role === 'docent' && !loading}
  <section style="margin-top: 32px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
      <h2 style="margin:0; font-size:20px;">Els meus alumnes</h2>
      <div style="flex: 1 0 100%; height:1px; background:#f3f4f6; margin-top:8px;"></div>
    </div>

    {#if loadingAlumnes}
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
        {#each Array(3) as _}
          <div style="border:1px solid #eef2ff; background:#ffffff; border-radius:16px; padding:16px; box-shadow:0 6px 20px rgba(0,0,0,0.04);">
            <div style="height:14px; width:60%; background:#e5e7eb; border-radius:6px; margin-bottom:10px;"></div>
            <div style="height:10px; width:80%; background:#eceef3; border-radius:6px;"></div>
          </div>
        {/each}
      </div>
    {:else if misAlumnes.length === 0}
      <div style="border:1px dashed #cbd5e1; background:#f8fafc; border-radius:16px; padding:24px; text-align:center; color:#64748b;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:8px; color:#64748b;">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" fill="currentColor"/>
        </svg>
        <div style="font-weight:600;">No tens alumnes assignats</div>
        <div style="font-size:14px;">Contacta amb l'administrador per assignar alumnes.</div>
      </div>
    {:else}
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;">
        {#each misAlumnes as alumne}
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
    {/if}
  </section>
{/if}
