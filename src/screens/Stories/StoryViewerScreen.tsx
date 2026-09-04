import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Animated, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalImage } from '../../components/LocalImage';
import { Avatar } from '../../components/Avatar';
import { markStoryViewed } from '../../db/repositories/storyRepository';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNowStrict } from 'date-fns';
import type { StoryGroup } from '../../types';

export function StoryViewerScreen({ route, navigation }: any) {
  const { groups, startIndex }: { groups: StoryGroup[]; startIndex: number } = route.params;
  const session = useAuthStore((s) => s.session)!;
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const closeOrNextGroup = useCallback(() => {
    if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      navigation.goBack();
    }
  }, [groupIndex, groups.length, navigation]);

  useEffect(() => {
    if (!story) { closeOrNextGroup(); return; }
    markStoryViewed(story.id, session.userId);
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: story.durationMs, useNativeDriver: false });
    anim.start(({ finished }) => { if (finished) advance(); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  const advance = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) setStoryIndex(storyIndex + 1);
    else closeOrNextGroup();
  };

  const goBackStory = () => {
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (groupIndex > 0) { setGroupIndex(groupIndex - 1); setStoryIndex(0); }
  };

  if (!story) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.progressRow}>
          {group.stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: i < storyIndex ? '100%' : i === storyIndex ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.header}>
          <Avatar path={group.author.avatarPath} size={32} />
          <Text style={styles.headerName}>{group.author.username}</Text>
          <Text style={styles.headerTime}>{formatDistanceToNowStrict(story.createdAt)}</Text>
        </View>
        <LocalImage path={story.mediaPath} style={StyleSheet.absoluteFillObject} priority="high" />
        <View style={styles.tapZones}>
          <Pressable style={{ flex: 1 }} onPress={goBackStory} />
          <Pressable style={{ flex: 1 }} onPress={advance} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressRow: { flexDirection: 'row', gap: 4, padding: 8, zIndex: 2 },
  progressTrack: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingBottom: 8, zIndex: 2 },
  headerName: { color: '#fff', fontWeight: '600', fontSize: 13 },
  headerTime: { color: '#ddd', fontSize: 12 },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 1 },
});
