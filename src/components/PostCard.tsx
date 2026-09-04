import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNowStrict } from 'date-fns';
import { LocalImage } from './LocalImage';
import { Avatar } from './Avatar';
import { HeartIcon, CommentIcon, BookmarkIcon } from './icons';
import { useTheme } from '../theme/useTheme';
import type { Post } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  post: Post;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onPressComments: (postId: string) => void;
  onPressProfile: (username: string) => void;
}

function PostCardBase({ post, onToggleLike, onToggleSave, onPressComments, onPressProfile }: Props) {
  const { colors } = useTheme();
  const heartScale = useSharedValue(0);
  const lastTap = useRef(0);

  const triggerLikeAnim = useCallback(() => {
    heartScale.value = withSequence(withSpring(1, { damping: 8, stiffness: 200 }), withSpring(0, { damping: 12 }));
  }, [heartScale]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!post.likedByMe) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleLike(post.id);
      }
      triggerLikeAnim();
    }
    lastTap.current = now;
  };

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }], opacity: heartScale.value }));

  const media = post.media[0];
  const aspectRatio = media ? Math.min(Math.max(media.width / media.height, 0.8), 1.25) : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Pressable style={styles.header} onPress={() => onPressProfile(post.author.username)}>
        <Avatar path={post.author.avatarPath} size={32} />
        <Text style={[styles.username, { color: colors.text }]}>{post.author.username}</Text>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>· {formatDistanceToNowStrict(post.createdAt)}</Text>
      </Pressable>

      <Pressable onPress={handleDoubleTap} style={{ width: SCREEN_W, aspectRatio }}>
        <LocalImage path={media?.path} style={StyleSheet.absoluteFillObject} priority="high" />
        <Animated.View style={[styles.heartOverlay, heartStyle]} pointerEvents="none">
          <HeartIcon size={90} color="#fff" filled />
        </Animated.View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={() => onToggleLike(post.id)} hitSlop={10}>
          <HeartIcon size={26} color={post.likedByMe ? '#ff3040' : colors.text} filled={post.likedByMe} />
        </Pressable>
        <Pressable onPress={() => onPressComments(post.id)} hitSlop={10}>
          <CommentIcon size={25} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => onToggleSave(post.id)} hitSlop={10}>
          <BookmarkIcon size={24} color={colors.text} filled={post.savedByMe} />
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.likeCount, { color: colors.text }]}>{post.likeCount.toLocaleString()} likes</Text>
        {!!post.caption && (
          <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
            <Text style={[styles.username, { color: colors.text }]}>{post.author.username} </Text>
            {post.caption}
          </Text>
        )}
        {post.commentCount > 0 && (
          <Pressable onPress={() => onPressComments(post.id)}>
            <Text style={[styles.viewComments, { color: colors.textMuted }]}>View all {post.commentCount} comments</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const PostCard = React.memo(PostCardBase, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.likedByMe === next.post.likedByMe &&
  prev.post.likeCount === next.post.likeCount &&
  prev.post.commentCount === next.post.commentCount &&
  prev.post.savedByMe === next.post.savedByMe
);

const styles = StyleSheet.create({
  container: {},
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  username: { fontWeight: '600', fontSize: 13 },
  timestamp: { fontSize: 12 },
  heartOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heartIcon: { fontSize: 90 },
  actions: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 16 },
  actionIcon: { fontSize: 24 },
  meta: { paddingHorizontal: 10, paddingBottom: 12, gap: 4 },
  likeCount: { fontWeight: '600', fontSize: 13 },
  caption: { fontSize: 13, lineHeight: 18 },
  viewComments: { fontSize: 13 },
});
