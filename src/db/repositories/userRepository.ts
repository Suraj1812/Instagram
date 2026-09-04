import { query, queryOne, execute, transaction, nowMs } from '../database';
import { indexEntity } from './searchRepository';
import { nanoid } from 'nanoid';
import type { UserProfile, Author } from '../../types';

interface UserRow {
  id: string; username: string; display_name: string | null; avatar_path: string | null; bio: string | null;
  is_private: number; followers_count: number; following_count: number; posts_count: number;
}

function rowToProfile(r: UserRow, meUserId: string, isFollowedByMe: boolean): UserProfile {
  return {
    id: r.id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined,
    bio: r.bio ?? undefined, isPrivate: !!r.is_private, followersCount: r.followers_count,
    followingCount: r.following_count, postsCount: r.posts_count,
    isFollowedByMe, isMe: r.id === meUserId,
  };
}

export async function getProfileByUsername(username: string, meUserId: string): Promise<UserProfile | null> {
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
  if (!row) return null;
  const follow = await queryOne<{ x: number }>('SELECT 1 as x FROM follows WHERE follower_id = ? AND followee_id = ?', [meUserId, row.id]);
  return rowToProfile(row, meUserId, !!follow);
}

export async function getProfileById(id: string, meUserId: string): Promise<UserProfile | null> {
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) return null;
  const follow = await queryOne<{ x: number }>('SELECT 1 as x FROM follows WHERE follower_id = ? AND followee_id = ?', [meUserId, row.id]);
  return rowToProfile(row, meUserId, !!follow);
}

export async function toggleFollow(myUserId: string, targetUserId: string, follow: boolean) {
  await transaction(async (db) => {
    if (follow) {
      const res = await db.runAsync(
        `INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
        [myUserId, targetUserId, nowMs()]
      );
      if (res.changes > 0) {
        await db.runAsync(`UPDATE users SET following_count = following_count + 1 WHERE id = ?`, [myUserId]);
        await db.runAsync(`UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`, [targetUserId]);
        await db.runAsync(
          `INSERT INTO notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
           VALUES (?, ?, 'follow', ?, 'user', ?, ?)`,
          [nanoid(), targetUserId, myUserId, myUserId, nowMs()]
        );
      }
    } else {
      const res = await db.runAsync(`DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, [myUserId, targetUserId]);
      if (res.changes > 0) {
        await db.runAsync(`UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?`, [myUserId]);
        await db.runAsync(`UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?`, [targetUserId]);
      }
    }
  });
}

export async function getFollowers(userId: string): Promise<Author[]> {
  const rows = await query<any>(
    `SELECT u.id, u.username, u.display_name, u.avatar_path FROM follows f
     JOIN users u ON u.id = f.follower_id WHERE f.followee_id = ? ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ id: r.id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path }));
}

export async function getFollowing(userId: string): Promise<Author[]> {
  const rows = await query<any>(
    `SELECT u.id, u.username, u.display_name, u.avatar_path FROM follows f
     JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ id: r.id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path }));
}

/** Suggested accounts: local users you don't already follow (drives Explore's "suggested" row and Search default state). */
export async function getSuggestedAccounts(meUserId: string, limit = 10): Promise<Author[]> {
  const rows = await query<any>(
    `SELECT id, username, display_name, avatar_path FROM users
     WHERE id != ? AND id NOT IN (SELECT followee_id FROM follows WHERE follower_id = ?)
     ORDER BY followers_count DESC LIMIT ?`,
    [meUserId, meUserId, limit]
  );
  return rows.map((r) => ({ id: r.id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path }));
}

export async function updateProfile(userId: string, updates: { displayName?: string; bio?: string; avatarPath?: string; isPrivate?: boolean }) {
  const fields: string[] = [];
  const params: any[] = [];
  if (updates.displayName !== undefined) { fields.push('display_name = ?'); params.push(updates.displayName); }
  if (updates.bio !== undefined) { fields.push('bio = ?'); params.push(updates.bio); }
  if (updates.avatarPath !== undefined) { fields.push('avatar_path = ?'); params.push(updates.avatarPath); }
  if (updates.isPrivate !== undefined) { fields.push('is_private = ?'); params.push(updates.isPrivate ? 1 : 0); }
  if (fields.length === 0) return;
  params.push(userId);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  if (updates.displayName) await indexEntity(userId, 'user', updates.displayName);
}
