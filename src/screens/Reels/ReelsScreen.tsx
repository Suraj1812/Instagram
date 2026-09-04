import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ViewToken } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResizeMode, Video } from 'expo-av';
import { getReelsPage, toggleLike, toggleSave } from '../../db/repositories/postRepository';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';
import { HeartIcon, CommentIcon, BookmarkIcon } from '../../components/icons';
import { EmptyState } from '../../components/EmptyState';
import type { Post } from '../../types';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function ReelItem({ post, isActive, onToggleLike, onToggleSave, onPressProfile }: {
  post: Post; isActive: boolean; onToggleLike: () => void; onToggleSave: () => void; onPressProfile: () => void;
}) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (isActive) videoRef.current?.playAsync();
    else videoRef.current?.pauseAsync();
  }, [isActive]);

  const media = post.media[0];
  const uri = media.path.startsWith('file://') ? media.path : `file://${media.path}`;

  return (
    <View style={{ width: SCREEN_W, height: SCREEN_H }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive}
        isMuted={false}
      />
      <View style={styles.overlay}>
        <View style={styles.bottomInfo}>
          <Pressable style={styles.authorRow} onPress={onPressProfile}>
            <Avatar path={post.author.avatarPath} size={32} />
            <Text style={styles.username}>{post.author.username}</Text>
          </Pressable>
          {!!post.caption && <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>}
        </View>
        <View style={styles.sideActions}>
          <Pressable onPress={onToggleLike} style={styles.sideBtn}>
            <HeartIcon size={30} color={post.likedByMe ? '#ff3040' : '#fff'} filled={post.likedByMe} />
            <Text style={styles.sideCount}>{post.likeCount}</Text>
          </Pressable>
          <Pressable style={styles.sideBtn}>
            <CommentIcon size={28} color="#fff" />
            <Text style={styles.sideCount}>{post.commentCount}</Text>
          </Pressable>
          <Pressable onPress={onToggleSave} style={styles.sideBtn}>
            <BookmarkIcon size={26} color="#fff" filled={post.savedByMe} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ReelsScreen({ navigation }: any) {
  const session = useAuthStore((s) => s.session)!;
  const [reels, setReels] = useState<Post[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReelsPage(session.userId, null, 20).then((r) => {
      setReels(r);
      setActiveId(r[0]?.id ?? null);
      setLoading(false);
    });
  }, [session.userId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveId(viewableItems[0].item.id);
  }).current;

  const onLike = useCallback(async (postId: string) => {
    setReels((prev) => prev.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p)));
    const target = reels.find((p) => p.id === postId);
    if (target) await toggleLike(session.userId, postId, !target.likedByMe);
  }, [reels, session.userId]);

  const onSave = useCallback(async (postId: string) => {
    setReels((prev) => prev.map((p) => (p.id === postId ? { ...p, savedByMe: !p.savedByMe } : p)));
    const target = reels.find((p) => p.id === postId);
    if (target) await toggleSave(session.userId, postId, !target.savedByMe);
  }, [reels, session.userId]);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (reels.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <EmptyState icon="🎬" title="No reels yet" subtitle="Reels you or people you follow post will show up here." />
      </SafeAreaView>
    );
  }

  return (
    <FlashList
      data={reels}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <ReelItem
          post={item}
          isActive={item.id === activeId}
          onToggleLike={() => onLike(item.id)}
          onToggleSave={() => onSave(item.id)}
          onPressProfile={() => navigation.navigate('Profile', { username: item.author.username })}
        />
      )}
      pagingEnabled
      estimatedItemSize={SCREEN_H}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', flexDirection: 'row' },
  bottomInfo: { flex: 1, padding: 16, paddingBottom: 32, justifyContent: 'flex-end' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  username: { color: '#fff', fontWeight: '700', fontSize: 14 },
  caption: { color: '#fff', fontSize: 13, lineHeight: 18 },
  sideActions: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 32, paddingRight: 12, gap: 20 },
  sideBtn: { alignItems: 'center' },
  sideIcon: { fontSize: 28 },
  sideCount: { color: '#fff', fontSize: 12, marginTop: 2, fontWeight: '600' },
});
