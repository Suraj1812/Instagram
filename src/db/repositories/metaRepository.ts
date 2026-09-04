import { queryOne, execute } from '../database';

export async function getMeta(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM kv_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await execute(
    `INSERT INTO kv_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function deleteMeta(key: string) {
  await execute('DELETE FROM kv_meta WHERE key = ?', [key]);
}
