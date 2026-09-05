import { nanoid } from 'nanoid';
import { supabase } from '../../services/supabaseClient';
import type { StoryGroup } from '../../types';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

interface StoryRow {
  id: string; author_id: string; media_path: string; media_type: string;
  duration_ms: number; created_at: number; expires_at: number;
  username: string; display_name: string | null; avatar_path: string | null;
  viewed_by_me: boolean;
}

/** Active (unexpired) stories grouped by author, ordered so unseen authors show first. */
export async function getActiveStoryGroups(meUserId: string): Promise<StoryGroup[]> {
  const { data, error } = await supabase.rpc('get_active_story_groups');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as StoryRow[];

  const groups = new Map<string, StoryGroup>();
  for (const r of rows) {
    if (!groups.has(r.author_id)) {
      groups.set(r.author_id, {
        authorId: r.author_id,
        author: { id: r.author_id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined },
        hasUnseen: false,
        stories: [],
      });
    }
    const g = groups.get(r.author_id)!;
    if (!r.viewed_by_me) g.hasUnseen = true;
    g.stories.push({
      id: r.id, authorId: r.author_id, mediaPath: r.media_path, mediaType: r.media_type as any,
      durationMs: r.duration_ms, createdAt: r.created_at, expiresAt: r.expires_at, viewedByMe: r.viewed_by_me,
    });
  }

  // Own story first, then unseen-first ordering for everyone else.
  const list = Array.from(groups.values());
  list.sort((a, b) => {
    if (a.authorId === meUserId) return -1;
    if (b.authorId === meUserId) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return 0;
  });
  return list;
}

export async function markStoryViewed(storyId: string, viewerId: string) {
  const { error } = await supabase.from('story_views').upsert({ story_id: storyId, viewer_id: viewerId, viewed_at: Date.now() });
  if (error) throw new Error(error.message);
}

export async function createStory(authorId: string, mediaPath: string, mediaType: 'image' | 'video', durationMs = 5000): Promise<string> {
  const id = nanoid();
  const now = Date.now();
  const { error } = await supabase.from('stories').insert({
    id, author_id: authorId, media_path: mediaPath, media_type: mediaType,
    duration_ms: durationMs, created_at: now, expires_at: now + STORY_TTL_MS,
  });
  if (error) throw new Error(error.message);
  return id;
}

/** Call occasionally (e.g. app foreground) to drop expired stories. Cheap no-op if nothing's expired. */
export async function pruneExpiredStories() {
  await supabase.from('stories').delete().lt('expires_at', Date.now());
}
