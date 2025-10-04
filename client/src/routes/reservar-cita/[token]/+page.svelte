<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { toastSuccess, toastError } from '$lib/toast';
  import Button from '$lib/components/Button.svelte';
  import Icon from '$lib/components/SimpleIcon.svelte';

  const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';

  let token = '';
  let tutorInfo: any = null;
  let loading = true;
  let reservando = false;

  // Calendario
  let mesActual = new Date();
  let slotsDisponibles: any[] = [];
  let slotSeleccionado: string | null = null;

  // Formulario
  let nomFamilia = '';
  let emailFamilia = '';
  let telefonFamilia = '';
  let notes = '';

  onMount(async () => {
    token = $page.params.token;
    await carregarInfoTutor();
    await carregarSlots();
  });

  async function carregarInfoTutor() {
    try {
      const res = await fetch(`${BASE}/api/citas/public/${token}/info`);
      if (!res.ok) throw new Error('Token no vàlid');
      tutorInfo = await res.json();
    } catch (err: any) {
      toastError(err.message || 'Error carregant informació');
    } finally {
      loading = false;
    }
  }

  async function carregarSlots() {
    try {
      const inicio = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).toISOString().split('T')[0];
      const fin = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).toISOString().split('T')[0];

      const res = await fetch(`${BASE}/api/citas/public/${token}/slots-disponibles?fecha_inicio=${inicio}&fecha_fin=${fin}`);
      if (!res.ok) throw new Error('Error carregant disponibilitat');
      slotsDisponibles = await res.json();
    } catch (err: any) {
      console.error('Error carregant slots:', err);
    }
  }

  async function reservarCita() {
    if (!slotSeleccionado || !nomFamilia || !emailFamilia || !telefonFamilia) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    try {
      reservando = true;
      const res = await fetch(`${BASE}/api/citas/public/${token}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_cita: slotSeleccionado,
          nom_familia: nomFamilia,
          email_familia: emailFamilia,
          telefon_familia: telefonFamilia,
          notes: notes || ''
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error reservant cita');
      }

      toastSuccess('Cita reservada correctament! Rebràs un email de confirmació.');

      // Resetear formulario
      nomFamilia = '';
      emailFamilia = '';
      telefonFamilia = '';
      notes = '';
      slotSeleccionado = null;

      await carregarSlots();

    } catch (err: any) {
      toastError(err.message || 'Error reservant cita');
    } finally {
      reservando = false;
    }
  }

  function mesAnterior() {
    mesActual = new Date(mesActual.getFullYear(), mesActual.getMonth() - 1);
    carregarSlots();
  }

  function mesSeguent() {
    mesActual = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1);
    carregarSlots();
  }

  const nombresMeses = [
    'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
    'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
  ];
</script>

<div class="reserva-container">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregant...</p>
    </div>
  {:else if !tutorInfo}
    <div class="error-state">
      <Icon name="alert-triangle" size={64} />
      <h2>Token no vàlid</h2>
      <p>El link de reserva no és vàlid o ha caducat.</p>
    </div>
  {:else}
    <div class="header">
      <h1>Reserva una cita amb {tutorInfo.tutor_nom}</h1>
      <p>Selecciona un horari disponible i omple les teves dades</p>
    </div>

    <div class="contenido">
      <!-- Calendario -->
      <div class="calendario-section">
        <div class="mes-header">
          <Button variant="ghost" size="sm" on:click={mesAnterior}>
            <Icon name="chevron-left" size={20} />
          </Button>
          <h3>{nombresMeses[mesActual.getMonth()]} {mesActual.getFullYear()}</h3>
          <Button variant="ghost" size="sm" on:click={mesSeguent}>
            <Icon name="chevron-right" size={20} />
          </Button>
        </div>

        <div class="slots-grid">
          {#if slotsDisponibles.length === 0}
            <div class="no-slots">
              <Icon name="calendar-x" size={48} />
              <p>No hi ha horaris disponibles aquest mes</p>
            </div>
          {:else}
            {#each slotsDisponibles as slot}
              <button
                class="slot-card"
                class:selected={slotSeleccionado === slot.datetime}
                on:click={() => slotSeleccionado = slot.datetime}
              >
                <div class="slot-fecha">{slot.fecha}</div>
                <div class="slot-hora">{slot.hora}</div>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Formulario -->
      <div class="formulario-section">
        <h3>Les teves dades</h3>

        {#if slotSeleccionado}
          <div class="slot-seleccionado">
            <Icon name="check-circle" size={20} />
            <span>Horari seleccionat: {new Date(slotSeleccionado).toLocaleString('ca-ES')}</span>
          </div>
        {/if}

        <div class="form-group">
          <label>Nom complet *</label>
          <input type="text" bind:value={nomFamilia} placeholder="Nom i cognoms" required />
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input type="email" bind:value={emailFamilia} placeholder="email@exemple.com" required />
        </div>

        <div class="form-group">
          <label>Telèfon *</label>
          <input type="tel" bind:value={telefonFamilia} placeholder="666 777 888" required />
        </div>

        <div class="form-group">
          <label>Notes addicionals</label>
          <textarea bind:value={notes} placeholder="Escriu aquí qualsevol informació addicional..." rows={4}></textarea>
        </div>

        <Button
          variant="filled"
          fullWidth
          on:click={reservarCita}
          disabled={!slotSeleccionado || reservando}
        >
          {reservando ? 'Reservant...' : 'Reservar Cita'}
        </Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .reserva-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: white;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    text-align: center;
    padding: 60px 20px;
    color: white;
  }

  .error-state h2 {
    margin: 20px 0 10px;
    font-size: 28px;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
    color: white;
  }

  .header h1 {
    font-size: 32px;
    margin-bottom: 10px;
  }

  .header p {
    font-size: 18px;
    opacity: 0.9;
  }

  .contenido {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    .contenido {
      grid-template-columns: 1fr;
    }
  }

  .calendario-section,
  .formulario-section {
    display: flex;
    flex-direction: column;
  }

  .mes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .mes-header h3 {
    font-size: 20px;
    color: #1f2937;
  }

  .slots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .slot-card {
    padding: 15px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    background: #f9fafb;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .slot-card:hover {
    border-color: #667eea;
    background: #f3f4f6;
    transform: translateY(-2px);
  }

  .slot-card.selected {
    border-color: #667eea;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .slot-fecha {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 5px;
  }

  .slot-hora {
    font-size: 16px;
    font-weight: 600;
  }

  .no-slots {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }

  .no-slots p {
    margin-top: 10px;
  }

  .formulario-section h3 {
    font-size: 22px;
    margin-bottom: 20px;
    color: #1f2937;
  }

  .slot-seleccionado {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #ecfdf5;
    border: 1px solid #10b981;
    border-radius: 8px;
    color: #065f46;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    font-family: inherit;
  }
</style>
