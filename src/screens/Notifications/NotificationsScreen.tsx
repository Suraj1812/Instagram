import React, { useEffect, useState, useCallback } from 'react';
import { Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNowStrict } from 'date-fns';
import { getNotifications, markAllRead } from '../../db/repositories/notificationRepository';
import { subscribeToNotifications } from '../../services/realtime';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/useTheme';
import type { AppNotification } from '../../types';

const LABELS: Record<AppNotification['type'], string> = {
  like: 'liked your post.',
  comment: 'commented on your post.',
  follow: 'started following you.',
  mention: 'mentioned you.',
};

export function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    const list = await getNotifications(session.userId);
    setItems(list);
    await markAllRead(session.userId);
  }, [session.userId]);

  useEffect(() => { load(); }, [load]);

  // Live: a fresh like/comment/follow while this screen is open reloads the list.
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(session.userId, () => { load(); });
    return unsubscribe;
  }, [session.userId, load]);

  const onPress = (n: AppNotification) => {
    if (n.targetType === 'post' && n.targetId) navigation.navigate('PostDetail', { postId: n.targetId });
    else navigation.navigate('Profile', { username: n.actor.username });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Text style={[styles.header, { color: colors.text }]}>Notifications</Text>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={<EmptyState icon="🔔" title="No notifications yet" subtitle="Likes, comments, and new followers will show up here." />}
        renderItem={({ item }) => (
          <Pressable style={[styles.row, !item.isRead && { backgroundColor: colors.surface }]} onPress={() => onPress(item)}>
            <Avatar path={item.actor.avatarPath} size={40} />
            <Text style={[styles.text, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>{item.actor.username}</Text> {LABELS[item.type]}
            </Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{formatDistanceToNowStrict(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 20, fontWeight: '700', padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  text: { flex: 1, fontSize: 13 },
  time: { fontSize: 11 },
});
