import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL no definido. Defínelo para habilitar acceso a BD.');
}

export const pool = new Pool({ connectionString });

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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


