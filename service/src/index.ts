import dotenv from 'dotenv';
import { createApp } from './app.js';
import { setupSyncCronJobs } from './cron/sync-cron.js';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config();

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Service listening on port ${port}`);

  // Inicializar cron jobs de sincronización si está habilitado
  const enableSync = process.env.ENABLE_SYNC_CRON !== 'false';
  if (enableSync) {
    setupSyncCronJobs();
    console.log('✅ Cron jobs de sincronización inicializados');
  } else {
    console.log('⏸️ Cron jobs de sincronización deshabilitados');
  }
});


