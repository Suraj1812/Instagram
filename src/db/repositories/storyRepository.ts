import { query, execute, nowMs } from '../database';
import { nanoid } from 'nanoid';
import type { StoryGroup } from '../../types';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

interface StoryRow {
  id: string; author_id: string; media_path: string; media_type: string;
  duration_ms: number; created_at: number; expires_at: number;
  username: string; display_name: string | null; avatar_path: string | null;
}

/** Active (unexpired) stories grouped by author, ordered so unseen authors show first. */
export async function getActiveStoryGroups(meUserId: string): Promise<StoryGroup[]> {
  const rows = await query<StoryRow>(
    `SELECT s.*, u.username, u.display_name, u.avatar_path FROM stories s
     JOIN users u ON u.id = s.author_id
     WHERE s.expires_at > ?
       AND (s.author_id = ? OR s.author_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
     ORDER BY s.created_at ASC`,
    [Date.now(), meUserId, meUserId]
  );

  const seenRows = await query<{ story_id: string }>(
    `SELECT story_id FROM story_views WHERE viewer_id = ?`,
    [meUserId]
  );
  const seenSet = new Set(seenRows.map((r) => r.story_id));

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
    const viewed = seenSet.has(r.id);
    if (!viewed) g.hasUnseen = true;
    g.stories.push({
      id: r.id, authorId: r.author_id, mediaPath: r.media_path, mediaType: r.media_type as any,
      durationMs: r.duration_ms, createdAt: r.created_at, expiresAt: r.expires_at, viewedByMe: viewed,
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
  await execute(
    `INSERT INTO story_views (story_id, viewer_id, viewed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    [storyId, viewerId, nowMs()]
  );
}

export async function createStory(authorId: string, mediaPath: string, mediaType: 'image' | 'video', durationMs = 5000): Promise<string> {
  const id = nanoid();
  const now = nowMs();
  await execute(
    `INSERT INTO stories (id, author_id, media_path, media_type, duration_ms, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, authorId, mediaPath, mediaType, durationMs, now, now + STORY_TTL_MS]
  );
  return id;
}

/** Call occasionally (e.g. app foreground) to drop expired stories and their view records. */
export async function pruneExpiredStories() {
  await execute(`DELETE FROM stories WHERE expires_at <= ?`, [Date.now()]);
}
