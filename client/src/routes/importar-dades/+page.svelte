<script lang="ts">
  import { onMount } from 'svelte';
  import { toastSuccess, toastError } from '$lib/toast';
  import Button from '$lib/components/Button.svelte';
  import Icon from '$lib/components/SimpleIcon.svelte';
  import { page } from '$app/stores';
  import { getToken } from '$lib/auth';

  let file: File | null = null;
  let loading = false;
  let progress = 0;
  let results: any = null;
  let isAuthenticated = false;
  let userRole = '';

  onMount(async () => {
    // Verificar estado de autenticación
    const token = getToken();
    if (token) {
      try {
        const response = await fetch('http://localhost:8081/usuaris/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          isAuthenticated = true;
          userRole = userData.role;
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
      }
    }
  });

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      file = target.files[0];
    }
  }

  async function importarDades() {
    if (!file) {
      toastError('Selecciona un archivo CSV');
      return;
    }

    // Verificar autenticación
    const token = getToken();
    if (!token) {
      toastError('No estás autenticado. Por favor, inicia sesión.');
      return;
    }

    try {
      loading = true;
      progress = 0;
      results = null;

      // Leer el archivo CSV
      const csvContent = await file.text();
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      console.log(`📊 Procesando ${lines.length} líneas...`);

      // Función para parsear CSV
      function parseCSVLine(line: string) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/"/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/"/g, ''));
        return result;
      }

      // Función para convertir fecha
      function convertirFecha(fechaStr: string) {
        if (!fechaStr) return null;
        try {
          const [dia, mes, año] = fechaStr.split('/');
          return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } catch (error) {
          return null;
        }
      }

      let importados = 0;
      let errores = 0;
      const erroresDetalle: string[] = [];

      // Procesar cada línea del CSV
      for (let i = 2; i < lines.length; i++) { // Empezar desde la línea 3
        if (lines[i].trim()) {
          const values = parseCSVLine(lines[i]);
          
          if (values.length >= 25) {
            try {
              const dato = {
                alumne_nom: values[3],
                alumne_email: values[8],
                sexe: values[1] === 'H' ? 'H' : values[1] === 'D' ? 'D' : 'X',
                grup: values[2], // Grupo del CSV (columna 3)
                data_naixement: convertirFecha(values[12]),
                municipi_naixement: values[13],
                nacionalitat: values[14],
                adreca: values[15],
                municipi_residencia: values[16],
                codi_postal: values[17],
                doc_identitat: values[10],
                tis: values[11],
                ralc: values[9],
                link_fotografia: values[24] || null, // "link fotografia" (columna 25)
                // Tutor personal (profesor asignado) - Columnas 7 y 8 (índices 6 y 7)
                tutor_personal_nom: values[6], // "tutor personal" (columna 7)
                tutor_personal_email: values[7], // "mail t.p." (columna 8)
                
                // Tutor 1 (padre/madre) - Columnas 19, 20, 21 (índices 18, 19, 20)
                tutor1_nom: values[18], // "Tutor 1" (columna 19)
                tutor1_tel: values[19], // "Telèfon " (columna 20)
                tutor1_email: values[20], // "email tutor 1" (columna 21)
                
                // Tutor 2 (padre/madre) - Columnas 22, 23, 24 (índices 21, 22, 23)
                tutor2_nom: values[21], // "Tutor 2" (columna 22)
                tutor2_tel: values[22], // "Telèfon" (columna 23)
                tutor2_email: values[23] // "email tutor 2" (columna 24)
              };

              // Crear alumno directamente (no buscar si existe)
              console.log(`📝 Creando alumno: ${dato.alumne_nom}`);
              console.log(`🔍 Debug grupo asignado:`, dato.grup);
              console.log(`🔍 Debug datos tutor personal:`, {
                nom: dato.tutor_personal_nom,
                email: dato.tutor_personal_email
              });
              console.log(`🔍 Debug datos tutor1:`, {
                nom: dato.tutor1_nom,
                tel: dato.tutor1_tel,
                email: dato.tutor1_email
              });
              console.log(`🔍 Debug datos tutor2:`, {
                nom: dato.tutor2_nom,
                tel: dato.tutor2_tel,
                email: dato.tutor2_email
              });

              // Crear IDs únicos
              const alumneId = `alumne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const personalId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              // Usar endpoint para crear alumno individual
              const importResponse = await fetch('http://localhost:8081/import-complet/alumne-individual', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                  alumne_id: alumneId,
                  personal_id: personalId,
                  alumne_nom: dato.alumne_nom,
                  email_alumnat: dato.alumne_email,
                  sexe: dato.sexe,
                  data_naixement: dato.data_naixement,
                  municipi_naixement: dato.municipi_naixement,
                  nacionalitat: dato.nacionalitat,
                  adreca: dato.adreca,
                  municipi_residencia: dato.municipi_residencia,
                  cp: dato.codi_postal,
                  doc_identitat: dato.doc_identitat,
                  tis: dato.tis,
                  ralc: dato.ralc,
                  link_fotografia: dato.link_fotografia,
                  tutor_personal_nom: dato.tutor_personal_nom,
                  tutor_personal_email: dato.tutor_personal_email,
                  tutor1_nom: dato.tutor1_nom,
                  tutor1_tel: dato.tutor1_tel,
                  tutor1_email: dato.tutor1_email,
                  tutor2_nom: dato.tutor2_nom,
                  tutor2_tel: dato.tutor2_tel,
                  tutor2_email: dato.tutor2_email,
                  grup: dato.grup || '1r ESO', // Grupo por defecto
                  anyCurs: '2025-2026'
                })
              });

              if (importResponse.ok) {
                importados++;
                console.log(`✅ ${dato.alumne_nom} - Alumno creado e importado correctamente`);
              } else {
                errores++;
                const errorData = await importResponse.text();
                let errorMessage = errorData;
                
                // Manejar errores específicos de autenticación
                if (importResponse.status === 401) {
                  errorMessage = 'No autorizado - token inválido';
                } else if (importResponse.status === 403) {
                  errorMessage = 'Permisos insuficientes - se requiere rol de administrador';
                } else if (importResponse.status === 404) {
                  errorMessage = 'Alumno no encontrado en la base de datos';
                }
                
                erroresDetalle.push(`${dato.alumne_nom}: ${errorMessage}`);
              }

            } catch (error: any) {
              errores++;
              erroresDetalle.push(`${values[3]}: ${error.message}`);
            }
          }
        }

        // Actualizar progreso
        progress = Math.round(((i - 2) / (lines.length - 2)) * 100);
      }

      results = {
        total: lines.length - 2,
        importados,
        errores,
        erroresDetalle
      };

      if (importados > 0) {
        toastSuccess(`Importación completada: ${importados} alumnos importados`);
      }
      if (errores > 0) {
        toastError(`${errores} errores durante la importación`);
      }

    } catch (error: any) {
      toastError('Error en la importación: ' + error.message);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Importar Dades Personals - Entrevistes</title>
</svelte:head>

<div class="container">
  <div class="header">
    <div class="header-content">
      <div class="header-title">
        <Icon name="upload" size={24} />
        <h1>Importar Dades Personals</h1>
      </div>
      <p>Importa los datos personales de todos los alumnos desde un archivo CSV</p>
    </div>
  </div>

  <div class="import-section">
    <!-- Información de ayuda -->
    <div class="help-section">
      <div class="help-card">
        <Icon name="info" size={20} />
        <div class="help-content">
          <h3>Formato del archivo CSV</h3>
          <p>El archivo debe contener las siguientes columnas:</p>
          <ul>
            <li><strong>Alumn@:</strong> Nombre completo del alumno</li>
            <li><strong>Sexe:</strong> H (hombre), D (dona), X (altres)</li>
            <li><strong>Data de naixement:</strong> DD/MM/YYYY</li>
            <li><strong>Adreça:</strong> Dirección completa</li>
            <li><strong>Tutor 1:</strong> Nombre del primer tutor</li>
            <li><strong>Email tutor 1:</strong> Email del primer tutor</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="file-selector">
      <label for="csv-file" class="file-label">
        <Icon name="upload" size={20} />
        Seleccionar archivo CSV
      </label>
      <input 
        id="csv-file" 
        type="file" 
        accept=".csv" 
        on:change={handleFileSelect}
        class="file-input"
      />
      {#if file}
        <div class="file-info">
          <Icon name="file" size={16} />
          <span>{file.name}</span>
          <span class="file-size">({Math.round(file.size / 1024)} KB)</span>
        </div>
      {/if}
    </div>

    <!-- Estado de autenticación -->
    {#if !isAuthenticated}
      <div class="auth-warning">
        <Icon name="alert-triangle" size={20} />
        <div class="auth-warning-content">
          <h4>No estás autenticado</h4>
          <p>Necesitas iniciar sesión para importar datos personales.</p>
          <Button variant="filled" on:click={() => window.location.href = '/'}>
            Ir al Login
          </Button>
        </div>
      </div>
    {:else if userRole !== 'admin'}
      <div class="auth-warning">
        <Icon name="alert-triangle" size={20} />
        <div class="auth-warning-content">
          <h4>Permisos insuficientes</h4>
          <p>Solo los administradores pueden importar datos personales.</p>
          <p>Tu rol actual: <strong>{userRole}</strong></p>
        </div>
      </div>
    {/if}

    <div class="actions">
      <Button 
        variant="filled" 
        leadingIcon="upload" 
        on:click={importarDades}
        disabled={!file || loading || !isAuthenticated || userRole !== 'admin'}
      >
        {loading ? 'Importando...' : 'Importar Datos'}
      </Button>
    </div>

    {#if loading}
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <div class="progress-text">Procesando... {progress}%</div>
      </div>
    {/if}

    {#if results}
      <div class="results">
        <h3>Resultados de la Importación</h3>
        <div class="results-grid">
          <div class="result-card success">
            <Icon name="check" size={20} />
            <div class="result-content">
              <div class="result-number">{results.importados}</div>
              <div class="result-label">Importados</div>
            </div>
          </div>
          <div class="result-card error">
            <Icon name="x" size={20} />
            <div class="result-content">
              <div class="result-number">{results.errores}</div>
              <div class="result-label">Errores</div>
            </div>
          </div>
          <div class="result-card info">
            <Icon name="users" size={20} />
            <div class="result-content">
              <div class="result-number">{results.total}</div>
              <div class="result-label">Total</div>
            </div>
          </div>
        </div>

        {#if results.erroresDetalle.length > 0}
          <div class="errors-detail">
            <h4>Detalle de Errores:</h4>
            <div class="errors-list">
              {#each results.erroresDetalle.slice(0, 10) as error}
                <div class="error-item">{error}</div>
              {/each}
              {#if results.erroresDetalle.length > 10}
                <div class="error-item">... y {results.erroresDetalle.length - 10} más</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  .header {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-sm);
  }

  .header-content {
    text-align: center;
  }

  .header-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 600;
    color: var(--fg);
    margin: 0;
  }

  .header p {
    color: var(--fg-secondary);
    font-size: 16px;
    margin: 0;
  }

  .import-section {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
  }

  .help-section {
    margin-bottom: 24px;
  }

  .help-card {
    display: flex;
    gap: 16px;
    padding: 20px;
    background: var(--info-50);
    border: 1px solid var(--info-200);
    border-radius: 8px;
    color: var(--info-700);
  }

  .help-content h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--info-800);
  }

  .help-content p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--info-600);
  }

  .help-content ul {
    margin: 0;
    padding-left: 20px;
    font-size: 14px;
    color: var(--info-600);
  }

  .help-content li {
    margin-bottom: 4px;
  }

  .file-selector {
    margin-bottom: 24px;
  }

  .file-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--primary-50);
    border: 2px dashed var(--primary-200);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    color: var(--primary-700);
  }

  .file-label:hover {
    background: var(--primary-100);
    border-color: var(--primary-300);
  }

  .file-input {
    display: none;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--success-50);
    border: 1px solid var(--success-200);
    border-radius: 6px;
    color: var(--success-700);
    font-size: 14px;
  }

  .file-size {
    color: var(--fg-secondary);
    font-size: 12px;
  }

  .actions {
    margin-bottom: 24px;
  }

  .auth-warning {
    display: flex;
    gap: 16px;
    padding: 20px;
    background: var(--warning-50);
    border: 1px solid var(--warning-200);
    border-radius: 8px;
    margin-bottom: 24px;
    color: var(--warning-700);
  }

  .auth-warning-content h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--warning-800);
  }

  .auth-warning-content p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--warning-600);
  }

  .auth-warning-content p:last-child {
    margin-bottom: 16px;
  }

  .progress-section {
    margin-bottom: 24px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--neutral-200);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-500);
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    color: var(--fg-secondary);
    font-size: 14px;
  }

  .results {
    margin-top: 24px;
  }

  .results h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 16px;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .result-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .result-card.success {
    background: var(--success-50);
    border-color: var(--success-200);
    color: var(--success-700);
  }

  .result-card.error {
    background: var(--error-50);
    border-color: var(--error-200);
    color: var(--error-700);
  }

  .result-card.info {
    background: var(--info-50);
    border-color: var(--info-200);
    color: var(--info-700);
  }

  .result-content {
    display: flex;
    flex-direction: column;
  }

  .result-number {
    font-size: 24px;
    font-weight: 700;
  }

  .result-label {
    font-size: 14px;
    opacity: 0.8;
  }

  .errors-detail {
    background: var(--error-50);
    border: 1px solid var(--error-200);
    border-radius: 8px;
    padding: 16px;
  }

  .errors-detail h4 {
    color: var(--error-700);
    margin-bottom: 12px;
    font-size: 16px;
  }

  .errors-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .error-item {
    padding: 4px 0;
    color: var(--error-600);
    font-size: 14px;
    border-bottom: 1px solid var(--error-200);
  }

  .error-item:last-child {
    border-bottom: none;
  }
</style>
