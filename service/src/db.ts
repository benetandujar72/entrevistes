import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;
let pool: Pool | null = null;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL no definido. Funcionando sin base de datos en desarrollo.');
} else {
  try {
    pool = new Pool({
      connectionString,
      max: 20, // Máximo de conexiones
      idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
      connectionTimeoutMillis: 10000, // Timeout de 10s para nuevas conexiones
      query_timeout: 30000, // Timeout de 30s para queries
      statement_timeout: 30000, // Timeout de 30s para statements
    });

    // Manejar errores del pool
    pool.on('error', (err) => {
      console.error('Error inesperado en pool de BD:', err);
    });

    // Test de conexión inicial
    pool.query('SELECT NOW()', (err) => {
      if (err) {
        console.error('❌ Error en test de conexión inicial:', err);
      } else {
        console.log('✅ Conexión a BD establecida correctamente');
      }
    });
  } catch (error) {
    console.warn('Error conectando a la base de datos:', error);
    pool = null;
  }
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!pool) {
    // En desarrollo sin BD, devolver datos mock
    console.log('Simulando query:', text);
    return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult<T>;
  }
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) {
    // En desarrollo sin BD, ejecutar función directamente
    console.log('Simulando transacción');
    const mockClient = {} as PoolClient;
    return fn(mockClient);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAnyActual(): Promise<string | null> {
  if (process.env.ANY_ACTUAL) return process.env.ANY_ACTUAL;
  try {
    const res = await query<{ valor: any }>('SELECT valor FROM config WHERE clave=$1', ['anyActual']);
    if (res.rowCount && res.rows[0]?.valor) {
      const v = res.rows[0].valor;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return v.value || null;
    }
  } catch {
    // ignore if table missing in dev
  }
  return null;
}

