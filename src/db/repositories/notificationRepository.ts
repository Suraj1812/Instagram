import { supabase } from '../../services/supabaseClient';
import type { AppNotification } from '../../types';

export async function getNotifications(meUserId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, actor_id, target_type, target_id, is_read, created_at, profiles!notifications_actor_id_fkey(username, display_name, avatar_path)')
    .eq('recipient_id', meUserId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, type: r.type,
    actor: { id: r.actor_id, username: r.profiles.username, displayName: r.profiles.display_name, avatarPath: r.profiles.avatar_path },
    targetType: r.target_type, targetId: r.target_id, isRead: r.is_read, createdAt: r.created_at,
  }));
}

export async function markAllRead(meUserId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', meUserId);
  if (error) throw new Error(error.message);
}

export async function getUnreadCount(meUserId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', meUserId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
