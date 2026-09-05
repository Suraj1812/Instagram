import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getExplorePage } from '../../db/repositories/postRepository';
import { getSuggestedAccounts, toggleFollow } from '../../db/repositories/userRepository';
import { useAuthStore } from '../../store/authStore';
import { LocalImage } from '../../components/LocalImage';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/useTheme';
import { SuggestedAccounts, SuggestedAccountsHeader } from '../../components/SuggestedAccounts';
import { LoadingState } from '../../components/LoadingState';
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
  const [followingUsername, setFollowingUsername] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getExplorePage(session.userId, 0, 24), getSuggestedAccounts(session.userId, 8)]);
      setPosts(p);
      setSuggested(s);
      setHasMore(p.length === 24);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? 'Could not load Explore.');
    } finally { setLoading(false); }
  }, [session.userId]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await getExplorePage(session.userId, posts.length, 24);
      setPosts((prev) => [...prev, ...next]);
      setHasMore(next.length === 24);
    } catch (error: any) {
      setLoadError(error?.message ?? 'Could not load more posts.');
    } finally { setLoadingMore(false); }
  };

  const followSuggestion = async (account: Author) => {
    setFollowingUsername(account.username);
    setSuggested((prev) => prev.filter((item) => item.id !== account.id));
    try {
      await toggleFollow(session.userId, account.id, true);
    } catch (error: any) {
      setSuggested((prev) => [account, ...prev]);
      Alert.alert('Could not follow account', error?.message ?? 'Please try again.');
    } finally {
      setFollowingUsername(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><LoadingState label="Loading Explore…" /></View>;

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListHeaderComponent={
          suggested.length > 0 ? (
            <View style={styles.suggestedSection}>
              <SuggestedAccountsHeader />
              <SuggestedAccounts
                accounts={suggested}
                loadingUsername={followingUsername}
                onPressProfile={(username) => navigation.navigate('Profile', { username })}
                onFollow={followSuggestion}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={loadError ? <EmptyState icon="⚠️" title="Explore is unavailable" subtitle="Pull down to try again." /> : <EmptyState icon="🔎" title="Nothing to explore yet" subtitle="Once more accounts post, they'll show up here." />}
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
  reelBadge: { position: 'absolute', top: 6, right: 6, fontSize: 14 },
});
