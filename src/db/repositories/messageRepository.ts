import { nanoid } from 'nanoid';
import { supabase } from '../../services/supabaseClient';
import type { ChatMessage, ConversationSummary } from '../../types';

export async function getOrCreateDirectConversation(userA: string, userB: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { user_a: userA, user_b: userB });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getConversations(_meUserId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_conversations');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: any) => ({
    id: c.id,
    title: c.title ?? c.other_display_name ?? c.other_username ?? 'Conversation',
    otherUser: c.other_id ? { id: c.other_id, username: c.other_username, displayName: c.other_display_name, avatarPath: c.other_avatar_path } : undefined,
    lastBody: c.last_body ?? undefined,
    updatedAt: c.updated_at,
    unreadCount: c.unread_count ?? 0,
  }));
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body,
    mediaPath: r.media_path, createdAt: r.created_at, readAt: r.read_at ?? undefined,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string, mediaPath?: string): Promise<ChatMessage> {
  const id = nanoid();
  const createdAt = Date.now();
  const { error } = await supabase.from('messages').insert({
    id, conversation_id: conversationId, sender_id: senderId, body, media_path: mediaPath ?? null, created_at: createdAt,
  });
  if (error) throw new Error(error.message);
  return { id, conversationId, senderId, body, mediaPath, createdAt };
}

export async function markConversationRead(conversationId: string, meUserId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: Date.now() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', meUserId)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}
