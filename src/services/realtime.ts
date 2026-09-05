import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Realtime subscriptions — thin wrappers around `postgres_changes`
 * so screens can just say "call me when a new message/notification lands"
 * without knowing anything about channels or filters. Each returns an
 * unsubscribe function; call it from a `useEffect` cleanup.
 */

export function subscribeToConversation(conversationId: string, onInsert: (row: any) => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToNotifications(userId: string, onInsert: (row: any) => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Fires whenever any conversation this user is in gets a new/updated row — used to live-refresh the conversation list. */
export function subscribeToConversationList(onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel('conversations:list')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
