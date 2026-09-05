import React, { useEffect, useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, RefreshControl, Text, Pressable, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeedStore } from '../../store/feedStore';
import { useAuthStore } from '../../store/authStore';
import { PostCard } from '../../components/PostCard';
import { StoryBar } from '../../components/StoryBar';
import { EmptyState } from '../../components/EmptyState';
import { HeartIcon, PaperPlaneIcon } from '../../components/icons';
import { useTheme } from '../../theme/useTheme';
import { getActiveStoryGroups } from '../../db/repositories/storyRepository';
import type { Post, StoryGroup } from '../../types';

const AVG_ITEM_HEIGHT = 520;

export function HomeFeedScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const { posts, loading, hasMore, load, loadMore, toggleLike, toggleSave } = useFeedStore();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    await load(session.userId);
    setStoryGroups(await getActiveStoryGroups(session.userId));
  }, [load, session.userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onToggleLike={(id) => toggleLike(session.userId, id)}
        onToggleSave={(id) => toggleSave(session.userId, id)}
        onPressComments={(postId) => navigation.navigate('PostDetail', { postId })}
        onPressProfile={(username) => navigation.navigate('Profile', { username })}
      />
    ),
    [navigation, session.userId, toggleLike, toggleSave]
  );

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.text} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Image
          source={require('../../../assets/instagram-wordmark.png')}
          style={[styles.wordmarkImage, { tintColor: colors.text }]}
          resizeMode="contain"
          accessibilityLabel="Instagram"
        />
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10}>
            <HeartIcon size={26} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Messages')} hitSlop={10}>
            <PaperPlaneIcon size={25} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <FlashList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={AVG_ITEM_HEIGHT}
        ListHeaderComponent={
          <StoryBar
            groups={storyGroups}
            myUserId={session.userId}
            onPressGroup={(g) => navigation.navigate('StoryViewer', { groups: storyGroups, startIndex: storyGroups.findIndex((x) => x.authorId === g.authorId) })}
            onPressAddStory={() => navigation.navigate('CreateStory')}
          />
        }
        ListEmptyComponent={<EmptyState icon="📸" title="Your feed is empty" subtitle="Follow a few accounts from Explore to see their posts here." />}
        ListFooterComponent={
          !hasMore && posts.length > 0 ? (
            <Text style={[styles.endOfFeed, { color: colors.textMuted }]}>You're all caught up ✓</Text>
          ) : null
        }
        onEndReached={() => loadMore(session.userId)}
        onEndReachedThreshold={2.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        overrideItemLayout={(layout, item) => {
          const ratio = item.media[0] ? item.media[0].width / item.media[0].height : 1;
          layout.size = 90 + AVG_ITEM_HEIGHT / Math.max(ratio, 0.8);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  wordmarkImage: { width: 132, height: 38 },
  dmIcon: { fontSize: 22 },
  endOfFeed: { textAlign: 'center', paddingVertical: 24, fontSize: 13 },
});
