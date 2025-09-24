<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    obtenirPlantillas,
    obtenirAlumnesTutorEmail,
    enviarEmailsMasivos,
    type PlantillaEmail,
    type AlumneEmail,
    getMe,
    type Me
  } from '$lib';
  import { toastError, toastSuccess } from '$lib/toast';

  let me: Me | null = null;
  let tutorSeleccionat: string = '';
  let plantillas: PlantillaEmail[] = [];
  let alumnes: AlumneEmail[] = [];
  let alumnesSeleccionats: string[] = [];
  let plantillaSeleccionada: string = '';
  let asunto: string = '';
  let contingut: string = '';
  let variables: Record<string, string> = {};
  
  let loading = false;
  let error: string | null = null;
  let enviant = false;

  onMount(async () => {
    console.log('🔍 Iniciant emails masivos...');
    me = await getMe();
    console.log('👤 Usuari autenticat:', me);
    
    if (me?.role === 'docent') {
      tutorSeleccionat = me.email;
      console.log('📧 Tutor seleccionat:', tutorSeleccionat);
    }
    
    await carregarPlantillas();
    await carregarAlumnes();
  });

  async function carregarPlantillas() {
    try {
      console.log('📧 Carregant plantilles...');
      loading = true;
      plantillas = await obtenirPlantillas();
      console.log('✅ Plantilles carregades:', plantillas);
    } catch (err: any) {
      console.error('❌ Error carregant plantilles:', err);
      error = err.message;
      toastError('Error carregant plantilles: ' + err.message);
    } finally {
      loading = false;
    }
  }

  async function carregarAlumnes() {
    if (!tutorSeleccionat) {
      console.log('⚠️ No hi ha tutor seleccionat');
      return;
    }
    
    try {
      console.log('👥 Carregant alumnes per tutor:', tutorSeleccionat);
      loading = true;
      alumnes = await obtenirAlumnesTutorEmail(tutorSeleccionat);
      console.log('✅ Alumnes carregats:', alumnes);
    } catch (err: any) {
      console.error('❌ Error carregant alumnes:', err);
      error = err.message;
      toastError('Error carregant alumnes: ' + err.message);
    } finally {
      loading = false;
    }
  }

  function seleccionarPlantilla() {
    const plantilla = plantillas.find(p => p.id === plantillaSeleccionada);
    if (plantilla) {
      contingut = plantilla.contingut;
      asunto = plantilla.nom;
      
      // Inicializar variables
      if (plantilla.variables) {
        plantilla.variables.forEach(variable => {
          if (!variables[variable]) {
            variables[variable] = '';
          }
        });
      }
    }
  }

  function seleccionarTotsAlumnes() {
    alumnesSeleccionats = alumnes.map(a => a.alumne_id);
  }

  function deseleccionarTotsAlumnes() {
    alumnesSeleccionats = [];
  }

  function toggleAlumne(alumneId: string) {
    if (alumnesSeleccionats.includes(alumneId)) {
      alumnesSeleccionats = alumnesSeleccionats.filter(id => id !== alumneId);
    } else {
      alumnesSeleccionats = [...alumnesSeleccionats, alumneId];
    }
  }

  async function enviarEmails() {
    if (!tutorSeleccionat || alumnesSeleccionats.length === 0 || !plantillaSeleccionada || !asunto || !contingut) {
      toastError('Si us plau, omple tots els camps obligatoris');
      return;
    }

    try {
      enviant = true;
      const resultat = await enviarEmailsMasivos({
        tutor_email: tutorSeleccionat,
        alumne_ids: alumnesSeleccionats,
        plantilla_id: plantillaSeleccionada,
        asunto: asunto,
        contingut: contingut,
        variables: variables
      });

      toastSuccess(`Emails enviats correctament! Total: ${resultat.total_emails} emails a ${resultat.total_alumnes} alumnes`);
      
      // Netejar formulari
      alumnesSeleccionats = [];
      plantillaSeleccionada = '';
      asunto = '';
      contingut = '';
      variables = {};
      
    } catch (err: any) {
      error = err.message;
      toastError('Error enviant emails: ' + err.message);
    } finally {
      enviant = false;
    }
  }

  // Recarregar alumnes quan canvia el tutor
  $: if (tutorSeleccionat) {
    carregarAlumnes();
  }

  // Actualizar contingut cuando cambia la plantilla
  $: if (plantillaSeleccionada) {
    seleccionarPlantilla();
  }
</script>

<div class="container">
  <h1>📧 Emails Masius</h1>
  
  {#if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {/if}

  <div class="form-section">
    <h2>Configuració</h2>
    
    <div class="form-row">
      <div class="form-group">
        <label for="tutor">Tutor:</label>
        <select id="tutor" bind:value={tutorSeleccionat} disabled={me?.role === 'docent'}>
          {#if me?.role === 'admin'}
            <option value="albert.parrilla@insbitacola.cat">Albert Parrilla</option>
            <option value="blanca.pi@insbitacola.cat">Blanca Pi</option>
            <option value="dani.palau@insbitacola.cat">Dani Palau</option>
            <option value="laia.giner@insbitacola.cat">Laia Giner</option>
            <option value="rony.castillo@insbitacola.cat">Rony Castillo</option>
            <option value="xavi.reyes@insbitacola.cat">Xavi Reyes</option>
          {:else}
            <option value={me?.email}>{me?.email}</option>
          {/if}
        </select>
      </div>

      <div class="form-group">
        <label for="plantilla">Plantilla:</label>
        <select id="plantilla" bind:value={plantillaSeleccionada}>
          <option value="">Selecciona una plantilla</option>
          {#each plantillas as plantilla}
            <option value={plantilla.id}>{plantilla.nom}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="asunto">Assumpte:</label>
      <input 
        id="asunto" 
        type="text" 
        bind:value={asunto}
        placeholder="Assumpte de l'email"
        required
      />
    </div>
  </div>

  <div class="form-section">
    <h2>Selecció d'Alumnes</h2>
    
    <div class="alumnes-controls">
      <button class="btn btn-secondary" onclick={seleccionarTotsAlumnes}>
        Seleccionar Tots
      </button>
      <button class="btn btn-secondary" onclick={deseleccionarTotsAlumnes}>
        Deseleccionar Tots
      </button>
      <span class="seleccionats">
        {alumnesSeleccionats.length} alumnes seleccionats
      </span>
    </div>

    <div class="alumnes-grid">
      {#each alumnes as alumne}
        <div class="alumne-card" class:seleccionat={alumnesSeleccionats.includes(alumne.alumne_id)}>
          <label class="alumne-checkbox">
            <input 
              type="checkbox" 
              checked={alumnesSeleccionats.includes(alumne.alumne_id)}
              onchange={() => toggleAlumne(alumne.alumne_id)}
            />
            <span class="alumne-info">
              <strong>{alumne.alumne_nom}</strong>
              <div class="contacte-info">
                {#if alumne.tutor1_email}
                  <div>📧 {alumne.tutor1_nom} ({alumne.tutor1_email})</div>
                {/if}
                {#if alumne.tutor2_email}
                  <div>📧 {alumne.tutor2_nom} ({alumne.tutor2_email})</div>
                {/if}
              </div>
            </span>
          </label>
        </div>
      {/each}
    </div>
  </div>

  <div class="form-section">
    <h2>Contingut de l'Email</h2>
    
    <div class="form-group">
      <label for="contingut">Contingut:</label>
      <textarea 
        id="contingut" 
        bind:value={contingut}
        rows="10"
        placeholder="Contingut de l'email. Pots usar variables com nom_alumne, tutor1_nom, tutor1_email, etc."
      ></textarea>
    </div>

    {#if Object.keys(variables).length > 0}
      <div class="variables-section">
        <h3>Variables Personalitzades</h3>
        <div class="variables-grid">
          {#each Object.entries(variables) as [key, value]}
            <div class="variable-input">
              <label for="var_{key}">{key}:</label>
              <input 
                id="var_{key}" 
                type="text" 
                bind:value={variables[key]}
                placeholder="Valor per a {key}"
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="form-section">
    <button 
      class="btn btn-primary btn-large" 
      onclick={enviarEmails}
      disabled={enviant || alumnesSeleccionats.length === 0 || !plantillaSeleccionada || !asunto || !contingut}
    >
      {enviant ? 'Enviant...' : `Enviar ${alumnesSeleccionats.length} Emails`}
    </button>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .form-section {
    background: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
  }

  .form-section h2 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .form-group label {
    font-weight: 600;
    color: #333;
  }

  .form-group select,
  .form-group input,
  .form-group textarea {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .form-group textarea {
    resize: vertical;
    font-family: inherit;
  }

  .alumnes-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #e3f2fd;
    border-radius: 6px;
  }

  .seleccionats {
    font-weight: 600;
    color: #1976d2;
  }

  .alumnes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
  }

  .alumne-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    background: white;
    transition: all 0.2s;
  }

  .alumne-card:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  }

  .alumne-card.seleccionat {
    border-color: #28a745;
    background: #f8fff9;
  }

  .alumne-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
  }

  .alumne-checkbox input[type="checkbox"] {
    margin: 0;
    transform: scale(1.2);
  }

  .alumne-info {
    flex: 1;
  }

  .contacte-info {
    margin-top: 8px;
    font-size: 12px;
    color: #666;
  }

  .contacte-info div {
    margin-bottom: 4px;
  }

  .variables-section {
    margin-top: 20px;
    padding: 15px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
  }

  .variables-section h3 {
    margin-top: 0;
    color: #856404;
  }

  .variables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }

  .variable-input {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .variable-input label {
    font-size: 12px;
    font-weight: 600;
    color: #856404;
    text-transform: uppercase;
  }

  .variable-input input {
    font-size: 14px;
    padding: 6px 10px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-large {
    padding: 15px 30px;
    font-size: 18px;
  }

  .btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error {
    background: #ffebee;
    border: 1px solid #f44336;
    color: #d32f2f;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .alumnes-grid {
      grid-template-columns: 1fr;
    }
    
    .variables-grid {
      grid-template-columns: 1fr;
    }
    
    .alumnes-controls {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
