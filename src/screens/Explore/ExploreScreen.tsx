import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExplorePage } from '../../db/repositories/postRepository';
import { getSuggestedAccounts } from '../../db/repositories/userRepository';
import { useAuthStore } from '../../store/authStore';
import { LocalImage } from '../../components/LocalImage';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/useTheme';
import type { Post, Author } from '../../types';

const { width } = Dimensions.get('window');
const GUTTER = 2;
const CELL = (width - GUTTER * 2) / 3;

export function ExploreScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggested, setSuggested] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      getExplorePage(session.userId, 0, 24),
      getSuggestedAccounts(session.userId, 8),
    ]);
    setPosts(p);
    setSuggested(s);
    setHasMore(p.length === 24);
    setLoading(false);
  }, [session.userId]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = await getExplorePage(session.userId, posts.length, 24);
    setPosts((prev) => [...prev, ...next]);
    setHasMore(next.length === 24);
    setLoadingMore(false);
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Pressable onPress={() => navigation.navigate('Search')}>
        <View pointerEvents="none">
          <Input placeholder="Search" editable={false} style={styles.searchBar} />
        </View>
      </Pressable>
      <FlashList
        data={posts}
        numColumns={3}
        keyExtractor={(p) => p.id}
        estimatedItemSize={CELL}
        onEndReached={loadMore}
        onEndReachedThreshold={2}
        ListHeaderComponent={
          suggested.length > 0 ? (
            <View style={styles.suggestedSection}>
              <Text style={[styles.suggestedTitle, { color: colors.text }]}>Suggested for you</Text>
              <FlashList
                horizontal
                data={suggested}
                keyExtractor={(a) => a.id}
                estimatedItemSize={80}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable style={styles.suggestedItem} onPress={() => navigation.navigate('Profile', { username: item.username })}>
                    <Avatar path={item.avatarPath} size={64} />
                    <Text style={[styles.suggestedName, { color: colors.text }]} numberOfLines={1}>{item.username}</Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon="🔎" title="Nothing to explore yet" subtitle="Once more accounts post, they'll show up here." />}
        renderItem={({ item }) => (
          <Pressable
            style={{ width: CELL, height: CELL, margin: GUTTER / 2 }}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          >
            <LocalImage path={item.media[0]?.thumbPath ?? item.media[0]?.path} style={{ flex: 1 }} />
            {item.isReel && <Text style={styles.reelBadge}>🎬</Text>}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { marginHorizontal: 12, marginBottom: 8 },
  suggestedSection: { paddingVertical: 12 },
  suggestedTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 12, marginBottom: 8 },
  suggestedItem: { alignItems: 'center', width: 80 },
  suggestedName: { fontSize: 11, marginTop: 4 },
  reelBadge: { position: 'absolute', top: 6, right: 6, fontSize: 14 },
});
