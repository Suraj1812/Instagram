import { query, execute } from '../database';
import type { AppNotification } from '../../types';

export async function getNotifications(meUserId: string): Promise<AppNotification[]> {
  const rows = await query<any>(
    `SELECT n.*, u.username, u.display_name, u.avatar_path FROM notifications n
     JOIN users u ON u.id = n.actor_id WHERE n.recipient_id = ? ORDER BY n.created_at DESC LIMIT 100`,
    [meUserId]
  );
  return rows.map((r) => ({
    id: r.id, type: r.type,
    actor: { id: r.actor_id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path },
    targetType: r.target_type, targetId: r.target_id, isRead: !!r.is_read, createdAt: r.created_at,
  }));
}

export async function markAllRead(meUserId: string) {
  await execute(`UPDATE notifications SET is_read = 1 WHERE recipient_id = ?`, [meUserId]);
}

export async function getUnreadCount(meUserId: string): Promise<number> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*) as n FROM notifications WHERE recipient_id = ? AND is_read = 0`, [meUserId]);
  return rows[0]?.n ?? 0;
}
