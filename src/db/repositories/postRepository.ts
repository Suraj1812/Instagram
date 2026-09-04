import { query, queryOne, execute, transaction, nowMs } from '../database';
import { indexEntity } from './searchRepository';
import { nanoid } from 'nanoid';
import type { Post, MediaItem } from '../../types';

interface PostRow {
  id: string; author_id: string; caption: string | null; media_type: string; media_json: string;
  is_reel: number; comment_count: number; created_at: number;
  username: string; display_name: string | null; avatar_path: string | null;
  like_count: number; liked_by_me: number; saved_by_me: number;
}

function rowToPost(r: PostRow): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    author: { id: r.author_id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined },
    caption: r.caption ?? '',
    mediaType: r.media_type as Post['mediaType'],
    media: JSON.parse(r.media_json) as MediaItem[],
    isReel: !!r.is_reel,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    likedByMe: !!r.liked_by_me,
    savedByMe: !!r.saved_by_me,
    createdAt: r.created_at,
  };
}

// Every post query joins in like_count / liked_by_me / saved_by_me relative
// to whichever account is currently logged in, via bound parameters, so
// switching local accounts naturally shows correct per-account state.
const POST_SELECT = `
  SELECT p.*, u.username, u.display_name, u.avatar_path,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as liked_by_me,
    (SELECT COUNT(*) FROM saves s WHERE s.post_id = p.id AND s.user_id = ?) as saved_by_me
  FROM posts p JOIN users u ON u.id = p.author_id
`;

/** Home feed: posts from people you follow (plus your own), newest first. */
export async function getFeedPage(meUserId: string, beforeTs: number | null, limit = 10): Promise<Post[]> {
  const cursor = beforeTs ?? Date.now() + 1;
  const rows = await query<PostRow>(
    `${POST_SELECT}
     WHERE p.is_reel = 0 AND p.created_at < ?
       AND (p.author_id = ? OR p.author_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
     ORDER BY p.created_at DESC LIMIT ?`,
    [meUserId, meUserId, cursor, meUserId, meUserId, limit]
  );
  return rows.map(rowToPost);
}

/** Explore grid: everything not from people you already follow, most-liked-ish ordering. */
export async function getExplorePage(meUserId: string, offset: number, limit = 24): Promise<Post[]> {
  const rows = await query<PostRow>(
    `${POST_SELECT}
     WHERE p.is_reel = 0 AND p.author_id != ?
       AND p.author_id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
     ORDER BY like_count DESC, p.created_at DESC LIMIT ? OFFSET ?`,
    [meUserId, meUserId, meUserId, meUserId, limit, offset]
  );
  return rows.map(rowToPost);
}

/** Reels feed: vertical short videos, newest first across everyone. */
export async function getReelsPage(meUserId: string, beforeTs: number | null, limit = 6): Promise<Post[]> {
  const cursor = beforeTs ?? Date.now() + 1;
  const rows = await query<PostRow>(
    `${POST_SELECT} WHERE p.is_reel = 1 AND p.created_at < ? ORDER BY p.created_at DESC LIMIT ?`,
    [meUserId, meUserId, cursor, limit]
  );
  return rows.map(rowToPost);
}

export async function getUserPosts(meUserId: string, authorId: string, reelsOnly = false): Promise<Post[]> {
  const rows = await query<PostRow>(
    `${POST_SELECT} WHERE p.author_id = ? AND p.is_reel = ? ORDER BY p.created_at DESC`,
    [meUserId, meUserId, authorId, reelsOnly ? 1 : 0]
  );
  return rows.map(rowToPost);
}

export async function getSavedPosts(meUserId: string): Promise<Post[]> {
  const rows = await query<PostRow>(
    `${POST_SELECT} JOIN saves sv ON sv.post_id = p.id AND sv.user_id = ? ORDER BY sv.created_at DESC`,
    [meUserId, meUserId, meUserId]
  );
  return rows.map(rowToPost);
}

export async function getPostById(meUserId: string, id: string): Promise<Post | null> {
  const row = await queryOne<PostRow>(`${POST_SELECT} WHERE p.id = ?`, [meUserId, meUserId, id]);
  return row ? rowToPost(row) : null;
}

/**
 * Toggling a like is a single-row insert/delete — no optimistic-vs-server
 * reconciliation needed since this IS the source of truth. The store still
 * flips in-memory state immediately for a snappy feel; this just persists it.
 */
export async function toggleLike(userId: string, postId: string, liked: boolean) {
  if (liked) {
    await execute(
      `INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
      [postId, userId, nowMs()]
    );
    const post = await queryOne<{ author_id: string }>('SELECT author_id FROM posts WHERE id = ?', [postId]);
    if (post && post.author_id !== userId) {
      await execute(
        `INSERT INTO notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
         VALUES (?, ?, 'like', ?, 'post', ?, ?)`,
        [nanoid(), post.author_id, userId, postId, nowMs()]
      );
    }
  } else {
    await execute(`DELETE FROM likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
  }
}

export async function toggleSave(userId: string, postId: string, saved: boolean) {
  if (saved) {
    await execute(`INSERT INTO saves (post_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`, [postId, userId, nowMs()]);
  } else {
    await execute(`DELETE FROM saves WHERE post_id = ? AND user_id = ?`, [postId, userId]);
  }
}

export async function createPost(input: {
  authorId: string; caption: string; mediaType: Post['mediaType']; media: MediaItem[]; isReel: boolean;
}): Promise<string> {
  const id = nanoid();
  await transaction(async (db) => {
    await db.runAsync(
      `INSERT INTO posts (id, author_id, caption, media_type, media_json, is_reel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.authorId, input.caption, input.mediaType, JSON.stringify(input.media), input.isReel ? 1 : 0, nowMs()]
    );
    await db.runAsync(`UPDATE users SET posts_count = posts_count + 1 WHERE id = ?`, [input.authorId]);
  });
  if (input.caption) await indexEntity(id, 'post', input.caption);
  return id;
}

export async function deletePost(postId: string, authorId: string) {
  await transaction(async (db) => {
    await db.runAsync(`DELETE FROM posts WHERE id = ?`, [postId]);
    await db.runAsync(`UPDATE users SET posts_count = MAX(0, posts_count - 1) WHERE id = ?`, [authorId]);
  });
}
