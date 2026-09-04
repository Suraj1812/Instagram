import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNowStrict } from 'date-fns';
import { getConversations } from '../../db/repositories/messageRepository';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { ChevronLeftIcon } from '../../components/icons';
import { useTheme } from '../../theme/useTheme';
import type { ConversationSummary } from '../../types';

export function MessagesListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const load = useCallback(async () => setConversations(await getConversations(session.userId)), [session.userId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeftIcon size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<EmptyState icon="💬" title="No messages yet" subtitle="Message someone from their profile to start a conversation." />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.title })}>
            <Avatar path={item.otherUser?.avatarPath} size={48} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.rowTime, { color: colors.textMuted }]}>{formatDistanceToNowStrict(item.updatedAt)}</Text>
              </View>
              <Text style={[styles.rowPreview, { color: colors.textMuted }]} numberOfLines={1}>{item.lastBody ?? 'No messages yet'}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontWeight: '600', fontSize: 14 },
  rowTime: { fontSize: 11 },
  rowPreview: { fontSize: 12, marginTop: 2 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
