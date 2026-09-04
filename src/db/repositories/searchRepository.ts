import { query, execute } from '../database';

export async function indexEntity(entityId: string, entityType: 'user' | 'post', text: string) {
  await execute(`DELETE FROM search_index WHERE entity_id = ? AND entity_type = ?`, [entityId, entityType]);
  await execute(`INSERT INTO search_index (entity_id, entity_type, text) VALUES (?, ?, ?)`, [entityId, entityType, text]);
}

export async function removeFromIndex(entityId: string, entityType: string) {
  await execute(`DELETE FROM search_index WHERE entity_id = ? AND entity_type = ?`, [entityId, entityType]);
}

export interface SearchHit {
  entity_id: string;
  entity_type: 'user' | 'post';
  text: string;
}

export async function searchAll(term: string, limit = 30): Promise<SearchHit[]> {
  const cleaned = term.trim().replace(/["*]/g, '');
  if (!cleaned) return [];
  return query<SearchHit>(
    `SELECT entity_id, entity_type, text FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT ?`,
    [`${cleaned}*`, limit]
  );
}
