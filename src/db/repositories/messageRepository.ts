import { query, queryOne, execute, transaction, nowMs } from '../database';
import { nanoid } from 'nanoid';
import type { ChatMessage, ConversationSummary } from '../../types';

export async function getOrCreateDirectConversation(userA: string, userB: string): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
     WHERE c.is_group = 0 LIMIT 1`,
    [userA, userB]
  );
  if (existing) return existing.id;

  const id = nanoid();
  await transaction(async (db) => {
    await db.runAsync(`INSERT INTO conversations (id, is_group, updated_at) VALUES (?, 0, ?)`, [id, nowMs()]);
    await db.runAsync(`INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`, [id, userA]);
    await db.runAsync(`INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`, [id, userB]);
  });
  return id;
}

export async function getConversations(meUserId: string): Promise<ConversationSummary[]> {
  const convos = await query<any>(
    `SELECT c.id, c.title, c.updated_at, m.body as last_body FROM conversations c
     LEFT JOIN messages m ON m.id = c.last_message_id
     JOIN conversation_members mem ON mem.conversation_id = c.id AND mem.user_id = ?
     ORDER BY c.updated_at DESC`,
    [meUserId]
  );

  const result: ConversationSummary[] = [];
  for (const c of convos) {
    const other = await queryOne<any>(
      `SELECT u.id, u.username, u.display_name, u.avatar_path FROM conversation_members m
       JOIN users u ON u.id = m.user_id WHERE m.conversation_id = ? AND m.user_id != ?`,
      [c.id, meUserId]
    );
    const unread = await queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`,
      [c.id, meUserId]
    );
    result.push({
      id: c.id,
      title: c.title ?? other?.display_name ?? other?.username ?? 'Conversation',
      otherUser: other ? { id: other.id, username: other.username, displayName: other.display_name, avatarPath: other.avatar_path } : undefined,
      lastBody: c.last_body ?? undefined,
      updatedAt: c.updated_at,
      unreadCount: unread?.n ?? 0,
    });
  }
  return result;
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = await query<any>(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`, [conversationId]);
  return rows.map((r) => ({
    id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body,
    mediaPath: r.media_path, createdAt: r.created_at, readAt: r.read_at ?? undefined,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string, mediaPath?: string): Promise<ChatMessage> {
  const id = nanoid();
  const createdAt = nowMs();
  await transaction(async (db) => {
    await db.runAsync(
      `INSERT INTO messages (id, conversation_id, sender_id, body, media_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, conversationId, senderId, body, mediaPath ?? null, createdAt]
    );
    await db.runAsync(`UPDATE conversations SET last_message_id = ?, updated_at = ? WHERE id = ?`, [id, createdAt, conversationId]);
  });
  return { id, conversationId, senderId, body, mediaPath, createdAt };
}

export async function markConversationRead(conversationId: string, meUserId: string) {
  await execute(
    `UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`,
    [nowMs(), conversationId, meUserId]
  );
}
