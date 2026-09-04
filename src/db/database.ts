import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schemaSql.generated';

let dbInstance: SQLite.SQLiteDatabase | null = null;
const SCHEMA_VERSION = 1;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('swiftgram.db');
  await runMigrations(dbInstance);
  return dbInstance;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
  // Future schema changes: `if (current < 2) { await db.execAsync('ALTER TABLE ...') }`
  // Never edit a migration that has already shipped — append a new one instead.
}

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []) {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function transaction(fn: (db: SQLite.SQLiteDatabase) => Promise<void>) {
  const db = await getDb();
  await db.withTransactionAsync(() => fn(db));
}

export function nowMs() {
  return Date.now();
}

/** Wipes all local data. Used by Settings > "Reset app data". */
export async function resetDatabase() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM messages; DELETE FROM conversation_members; DELETE FROM conversations;
    DELETE FROM notifications; DELETE FROM story_views; DELETE FROM stories;
    DELETE FROM comments; DELETE FROM saves; DELETE FROM likes; DELETE FROM follows;
    DELETE FROM posts; DELETE FROM users; DELETE FROM search_index; DELETE FROM kv_meta;
  `);
}
