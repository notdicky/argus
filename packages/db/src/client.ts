import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __argusSql?: ReturnType<typeof postgres>;
  __argusDb?: Database;
};

function init(): Database {
  if (globalForDb.__argusDb) {
    return globalForDb.__argusDb;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = globalForDb.__argusSql ?? postgres(url, { max: 10 });
  const instance = drizzle(sql, { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__argusSql = sql;
    globalForDb.__argusDb = instance;
  }
  return instance;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = init();
    const value = instance[prop as keyof Database];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
