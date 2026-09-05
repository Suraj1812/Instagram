import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { getProfileByUsername, toggleFollow } from '../../db/repositories/userRepository';
import { getUserPosts } from '../../db/repositories/postRepository';
import { getOrCreateDirectConversation } from '../../db/repositories/messageRepository';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';
import { LocalImage } from '../../components/LocalImage';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MenuIcon, ReelsIcon } from '../../components/icons';
import { LoadingState } from '../../components/LoadingState';
import { useTheme } from '../../theme/useTheme';
import type { UserProfile, Post } from '../../types';

const { width } = Dimensions.get('window');
const CELL = width / 3;

export function ProfileScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const logout = useAuthStore((s) => s.logout);
  const username = route.params?.username ?? session.username;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'posts' | 'reels'>('posts');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfileByUsername(username, session.userId);
      setProfile(p);
      if (p) setPosts(await getUserPosts(session.userId, p.id, tab === 'reels'));
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? 'Could not load this profile.');
    } finally { setLoading(false); }
  }, [username, session.userId, tab]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const onFollow = async () => {
    if (!profile) return;
    const next = !profile.isFollowedByMe;
    setProfile({ ...profile, isFollowedByMe: next, followersCount: profile.followersCount + (next ? 1 : -1) });
    try {
      await toggleFollow(session.userId, profile.id, next);
    } catch (error: any) {
      setProfile({ ...profile, isFollowedByMe: !next, followersCount: profile.followersCount });
      Alert.alert('Could not update follow', error?.message ?? 'Please try again.');
    }
  };

  const onMessage = async () => {
    if (!profile) return;
    try {
      const convoId = await getOrCreateDirectConversation(session.userId, profile.id);
      navigation.navigate('Chat', { conversationId: convoId, title: profile.username });
    } catch (error: any) {
      Alert.alert('Could not start message', error?.message ?? 'Please try again.');
    }
  };

  if (!profile) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{loading ? <LoadingState label="Loading profile…" /> : <EmptyState icon="alert-circle-outline" title="Profile unavailable" subtitle={loadError ?? 'Try again in a moment.'} />}</View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.usernameTop, { color: colors.text }]}>{profile.username}</Text>
        {profile.isMe && (
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10}>
            <MenuIcon size={22} color={colors.text} />
          </Pressable>
        )}
      </View>

      <View style={styles.headerRow}>
        <Avatar path={profile.avatarPath} size={80} />
        <View style={styles.stats}>
          <Stat label="Posts" value={profile.postsCount} />
          <Pressable onPress={() => navigation.navigate('Followers', { userId: profile.id, mode: 'followers' })}>
            <Stat label="Followers" value={profile.followersCount} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Followers', { userId: profile.id, mode: 'following' })}>
            <Stat label="Following" value={profile.followingCount} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.name, { color: colors.text }]}>{profile.displayName ?? profile.username}</Text>
      {!!profile.bio && <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>}

      <View style={styles.actionsRow}>
        {profile.isMe ? (
          <Button label="Edit profile" variant="secondary" onPress={() => navigation.navigate('EditProfile')} style={{ flex: 1 }} />
        ) : (
          <>
            <Button label={profile.isFollowedByMe ? 'Following' : 'Follow'} variant={profile.isFollowedByMe ? 'secondary' : 'primary'} onPress={onFollow} style={{ flex: 1 }} />
            <Button label="Message" variant="secondary" onPress={onMessage} style={{ flex: 1 }} />
          </>
        )}
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <Pressable style={[styles.tabBtn, tab === 'posts' && { borderBottomColor: colors.text, borderBottomWidth: 2 }]} onPress={() => setTab('posts')}>
          <View style={styles.gridIcon}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.gridRow}>
                {[0, 1, 2].map((col) => <View key={col} style={[styles.gridCell, { borderColor: tab === 'posts' ? colors.text : colors.textMuted }]} />)}
              </View>
            ))}
          </View>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'reels' && { borderBottomColor: colors.text, borderBottomWidth: 2 }]} onPress={() => setTab('reels')}>
          <ReelsIcon size={22} color={tab === 'reels' ? colors.text : colors.textMuted} />
        </Pressable>
      </View>

      <FlashList
        data={posts}
        numColumns={3}
        estimatedItemSize={CELL}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<EmptyState icon={tab === 'reels' ? 'play-circle-outline' : 'images-outline'} title={tab === 'reels' ? 'No reels yet' : 'No posts yet'} />}
        renderItem={({ item }) => (
          <Pressable style={{ width: CELL, height: CELL }} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
            <LocalImage path={item.media[0]?.thumbPath ?? item.media[0]?.path} style={{ flex: 1, margin: 1 }} />
          </Pressable>
        )}
      />

      {profile.isMe && (
        <Pressable style={styles.logout} onPress={logout}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Log out</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  usernameTop: { fontSize: 17, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 20 },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontWeight: '700', fontSize: 16 },
  statLabel: { fontSize: 12 },
  name: { fontWeight: '600', paddingHorizontal: 16 },
  bio: { paddingHorizontal: 16, paddingTop: 4, fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 8, padding: 16 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  gridIcon: { width: 18, height: 18, gap: 2 },
  gridRow: { flexDirection: 'row', gap: 2, flex: 1 },
  gridCell: { flex: 1, borderWidth: 1.3, borderRadius: 1 },
  logout: { alignItems: 'center', padding: 16 },
});
