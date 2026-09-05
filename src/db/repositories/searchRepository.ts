import { supabase } from '../../services/supabaseClient';

// Search is now a plain ILIKE query against Postgres (via the search_all RPC)
// instead of a local FTS5 index the app had to maintain itself — so there's
// nothing to keep in sync. These two are no-ops kept only so existing call
// sites (createPost, updateProfile, signup) don't need to change.
export async function indexEntity(_entityId: string, _entityType: 'user' | 'post', _text: string) {}
export async function removeFromIndex(_entityId: string, _entityType: string) {}

export interface SearchHit {
  entity_id: string;
  entity_type: 'user' | 'post';
  text: string;
}

export async function searchAll(term: string, limit = 30): Promise<SearchHit[]> {
  const cleaned = term.trim();
  if (!cleaned) return [];
  const { data, error } = await supabase.rpc('search_all', { term: cleaned, result_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ entity_id: r.entity_id, entity_type: r.entity_type, text: r.text_value }));
}
