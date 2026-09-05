import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages, sendMessage, markConversationRead } from '../../db/repositories/messageRepository';
import { subscribeToConversation } from '../../services/realtime';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { ChevronLeftIcon, PhoneCallIcon, VideoCameraIcon } from '../../components/icons';
import { useTheme } from '../../theme/useTheme';
import type { ChatMessage } from '../../types';

export function ChatScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { conversationId, title } = route.params;
  const session = useAuthStore((s) => s.session)!;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setMessages(await getMessages(conversationId));
    await markConversationRead(conversationId, session.userId);
  }, [conversationId, session.userId]);

  useEffect(() => { load(); }, [load]);

  // Live updates: if the other person sends a message while this screen is
  // open, it appears instantly instead of waiting for a manual refresh.
  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, {
        id: row.id, conversationId: row.conversation_id, senderId: row.sender_id,
        body: row.body, mediaPath: row.media_path ?? undefined, createdAt: row.created_at, readAt: row.read_at ?? undefined,
      }]));
      if (row.sender_id !== session.userId) markConversationRead(conversationId, session.userId);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return unsubscribe;
  }, [conversationId, session.userId]);

  const onSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    const msg = await sendMessage(conversationId, session.userId, text);
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()}><ChevronLeftIcon size={24} color={colors.text} /></Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{title ?? 'Chat'}</Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Pressable onPress={() => navigation.navigate('CallSetup', { title })} hitSlop={8}>
              <PhoneCallIcon size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('CallSetup', { title })} hitSlop={8}>
              <VideoCameraIcon size={23} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.senderId === session.userId;
            return (
              <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: colors.accent }] : [styles.theirs, { backgroundColor: colors.surfaceAlt }]]}>
                <Text style={{ color: mine ? '#fff' : colors.text }}>{item.body}</Text>
              </View>
            );
          }}
        />
        <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
          <Input placeholder="Message…" value={draft} onChangeText={setDraft} style={{ flex: 1 }} />
          <Pressable onPress={onSend} disabled={!draft.trim()} style={{ marginLeft: 10 }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Send</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700', fontSize: 16 },
  bubble: { marginHorizontal: 10, marginVertical: 4, padding: 10, borderRadius: 16, maxWidth: '75%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
