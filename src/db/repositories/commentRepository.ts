import { query, transaction, nowMs } from '../database';
import { nanoid } from 'nanoid';
import type { Comment } from '../../types';

interface CommentRow {
  id: string; post_id: string; author_id: string; body: string; created_at: number;
  username: string; display_name: string | null; avatar_path: string | null;
}

function rowToComment(r: CommentRow): Comment {
  return {
    id: r.id, postId: r.post_id, authorId: r.author_id,
    author: { id: r.author_id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined },
    body: r.body, createdAt: r.created_at,
  };
}

export async function getComments(postId: string): Promise<Comment[]> {
  const rows = await query<CommentRow>(
    `SELECT c.*, u.username, u.display_name, u.avatar_path FROM comments c
     JOIN users u ON u.id = c.author_id WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows.map(rowToComment);
}

export async function addComment(postId: string, authorId: string, body: string): Promise<Comment> {
  const id = nanoid();
  const createdAt = nowMs();
  await transaction(async (db) => {
    await db.runAsync(`INSERT INTO comments (id, post_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`, [id, postId, authorId, body, createdAt]);
    await db.runAsync(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`, [postId]);
    const post = await db.getFirstAsync<{ author_id: string }>('SELECT author_id FROM posts WHERE id = ?', [postId]);
    if (post && post.author_id !== authorId) {
      await db.runAsync(
        `INSERT INTO notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
         VALUES (?, ?, 'comment', ?, 'post', ?, ?)`,
        [nanoid(), post.author_id, authorId, postId, createdAt]
      );
    }
  });
  const author = await query<any>('SELECT id, username, display_name, avatar_path FROM users WHERE id = ?', [authorId]);
  const a = author[0];
  return { id, postId, authorId, author: { id: a.id, username: a.username, displayName: a.display_name, avatarPath: a.avatar_path }, body, createdAt };
}

export async function deleteComment(commentId: string, postId: string) {
  await transaction(async (db) => {
    await db.runAsync(`DELETE FROM comments WHERE id = ?`, [commentId]);
    await db.runAsync(`UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?`, [postId]);
  });
}
