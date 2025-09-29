<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getToken } from '$lib/auth';
  import Icon from '$lib/components/SimpleIcon.svelte';

  let alumneId = '';
  let alumneNom = '';
  let grup = '';
  let curs = '';
  let email = '';
  let telefon = '';
  let tutor = '';
  let tutorEmail = '';
  let dataEntrevista = '';
  let acords = '';
  let loading = false;
  let error: string | null = null;
  let success = false;
  
  // Dades del primer tutor per a la cita
  let nomFamilia = '';
  let emailFamilia = '';
  let telefonFamilia = '';

  onMount(() => {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams($page.url.search);
    alumneId = urlParams.get('alumne') || '';
    alumneNom = urlParams.get('nom') || '';
    grup = urlParams.get('grup') || '';
    curs = urlParams.get('curs') || '';
    email = urlParams.get('email') || '';
    telefon = urlParams.get('telefon') || '';
    tutor = urlParams.get('tutor') || '';
    tutorEmail = urlParams.get('tutor_email') || '';
    
    // Dades del primer tutor per a la cita
    nomFamilia = urlParams.get('nom_familia') || '';
    emailFamilia = urlParams.get('email_familia') || '';
    telefonFamilia = urlParams.get('telefon_familia') || '';
    
    console.log('🔍 DEBUG - Parámetros de URL:', {
      alumneId,
      alumneNom,
      grup,
      curs,
      email,
      telefon,
      tutor,
      tutorEmail,
      nomFamilia,
      emailFamilia,
      telefonFamilia
    });
    
    // Establecer fecha actual como predeterminada
    const today = new Date();
    dataEntrevista = today.toISOString().split('T')[0];
  });

  async function guardarEntrevista() {
    if (!alumneId || !dataEntrevista || !acords.trim()) {
      error = 'Cal omplir tots els camps obligatoris';
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch('http://localhost:8081/entrevistes/nova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          alumneId,
          alumneNom,
          grup,
          curs,
          data: dataEntrevista,
          acords: acords.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error guardant l\'entrevista');
      }

      success = true;
      setTimeout(() => {
        goto(`/alumnes/${alumneId}`);
      }, 2000);

    } catch (e: any) {
      error = e?.message || 'Error guardant l\'entrevista';
    } finally {
      loading = false;
    }
  }

  function cancelar() {
    goto(`/alumnes/${alumneId}`);
  }
</script>

<div class="page-header">
  <h1 class="page-title">
    <Icon name="notes" size={24} />
    Nova Entrevista
  </h1>
</div>

{#if success}
  <div class="success-card">
    <div class="success-icon">
      <Icon name="check-circle" size={20} />
    </div>
    <div class="success-content">
      <div class="success-title">Entrevista guardada correctament</div>
      <div class="success-subtitle">Redirigint a la fitxa de l'alumne...</div>
    </div>
  </div>
{:else}
  <div class="form-container">
    <form onsubmit={(e) => { e.preventDefault(); guardarEntrevista(); }} class="form">
      
      <!-- Informació de l'alumne (només lectura) -->
      <div class="card card-readonly">
        <div class="card-header">
          <Icon name="user" size={18} />
          <h3>Informació de l'alumne</h3>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="alumne-nom">Nom de l'alumne</label>
            <input 
              id="alumne-nom"
              type="text" 
              bind:value={alumneNom} 
              readonly 
              class="input input-readonly"
            />
          </div>
          <div class="form-group">
            <label for="alumne-grup">Grup</label>
            <input 
              id="alumne-grup"
              type="text" 
              bind:value={grup} 
              readonly 
              class="input input-readonly"
            />
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="alumne-curs">Curs actual</label>
            <input 
              id="alumne-curs"
              type="text" 
              bind:value={curs} 
              readonly 
              class="input input-readonly"
            />
          </div>
          {#if email}
            <div class="form-group">
              <label for="alumne-email">Email de l'alumne</label>
              <input 
                id="alumne-email"
                type="email" 
                bind:value={email} 
                readonly 
                class="input input-readonly"
              />
            </div>
          {/if}
        </div>
        {#if telefon || tutor || tutorEmail}
          <div class="form-grid">
            {#if telefon}
              <div class="form-group">
                <label for="alumne-telefon">Telèfon de l'alumne</label>
                <input 
                  id="alumne-telefon"
                  type="tel" 
                  bind:value={telefon} 
                  readonly 
                  class="input input-readonly"
                />
              </div>
            {/if}
            {#if tutor}
              <div class="form-group">
                <label for="alumne-tutor">Tutor/a</label>
                <input 
                  id="alumne-tutor"
                  type="text" 
                  bind:value={tutor} 
                  readonly 
                  class="input input-readonly"
                />
              </div>
            {/if}
          </div>
          {#if tutorEmail}
            <div class="form-group">
              <label for="alumne-tutor-email">Email del tutor/a</label>
              <input 
                id="alumne-tutor-email"
                type="email" 
                bind:value={tutorEmail} 
                readonly 
                class="input input-readonly"
              />
            </div>
          {/if}
        {/if}
      </div>

      <!-- Dades de l'entrevista -->
      <div class="card">
        <div class="card-header">
          <Icon name="calendar" size={18} />
          <h3>Dades de l'entrevista</h3>
        </div>
        
        <div class="form-group">
          <label for="data" class="required">Data de l'entrevista</label>
          <div class="input-with-icon">
            <input 
              id="data" 
              name="data"
              type="date" 
              bind:value={dataEntrevista} 
              required
              class="input"
            />
            <Icon name="calendar" size={16} class="input-icon" />
          </div>
          <div class="helper-text">
            Data seleccionada: {dataEntrevista || 'No seleccionada'}
          </div>
        </div>

        <div class="form-group">
          <label for="acords" class="required">Acords de l'entrevista</label>
          <textarea 
            id="acords" 
            name="acords"
            bind:value={acords} 
            required
            placeholder="Descriviu els acords presos durant l'entrevista..."
            rows="6"
            class="textarea"
          ></textarea>
        </div>
      </div>

      <!-- Botons -->
      <div class="form-actions">
        <button 
          type="button" 
          onclick={cancelar}
          disabled={loading}
          class="btn btn-outlined-primary"
        >
          <Icon name="chevron-left" size={16} />
          Cancel·lar
        </button>
        <button 
          type="submit" 
          disabled={loading}
          class="btn btn-filled-primary"
        >
          {#if loading}
            <span class="btn-spinner"></span>
          {:else}
            <Icon name="check" size={16} />
          {/if}
          {loading ? 'Guardant...' : 'Guardar entrevista'}
        </button>
      </div>
    </form>

    {#if error}
      <div class="error-card">
        <Icon name="alert-circle" size={18} />
        <span>{error}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* === HEADER === */
  .page-header {
    margin-bottom: 2rem;
  }
  
  .page-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  /* === SUCCESS STATE === */
  .success-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--success-50);
    border: 1px solid var(--success-500);
    border-radius: var(--radius-lg);
    color: var(--success-600);
    text-align: center;
    max-width: 600px;
    margin: 0 auto;
  }

  .success-icon {
    flex-shrink: 0;
  }

  .success-content {
    flex: 1;
  }

  .success-title {
    font-weight: 600;
    font-size: var(--text-lg);
    margin-bottom: 0.5rem;
  }

  .success-subtitle {
    font-size: var(--text-sm);
    opacity: 0.8;
  }

  /* === FORM CONTAINER === */
  .form-container {
    max-width: 600px;
    margin: 0 auto;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* === CARDS === */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--card-shadow);
  }

  .card-readonly {
    background: var(--google-grey-50);
    border-color: var(--google-grey-200);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--fg);
  }

  /* === FORM GRID === */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  /* === FORM GROUPS === */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--fg-secondary);
  }

  .form-group label.required::after {
    content: ' *';
    color: var(--error-500);
  }

  /* === INPUTS === */
  .input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    background: var(--input-bg);
    color: var(--fg);
    transition: all 0.2s ease;
  }

  .input:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .input-readonly {
    background: var(--google-grey-100);
    color: var(--google-grey-600);
    cursor: not-allowed;
  }

  .input-with-icon {
    position: relative;
  }

  .input-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--google-grey-400);
    pointer-events: none;
  }

  .textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    resize: vertical;
    min-height: 6rem;
    transition: all 0.2s ease;
  }

  .textarea:focus {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--input-ring);
  }

  .helper-text {
    font-size: var(--text-xs);
    color: var(--fg-secondary);
    margin-top: 0.25rem;
  }

  /* === FORM ACTIONS === */
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  /* === ERROR CARD === */
  .error-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--error-50);
    border: 1px solid var(--error-500);
    border-radius: var(--radius-md);
    color: var(--error-600);
    font-size: var(--text-sm);
    margin-top: 1rem;
  }

  /* === RESPONSIVE === */
  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
    }
  }
</style>
