import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { useTheme } from '../theme/useTheme';
import type { StoryGroup } from '../types';

interface Props {
  groups: StoryGroup[];
  myUserId: string;
  onPressGroup: (group: StoryGroup) => void;
  onPressAddStory: () => void;
}

export function StoryBar({ groups, myUserId, onPressGroup, onPressAddStory }: Props) {
  const { colors } = useTheme();
  const myGroup = groups.find((g) => g.authorId === myUserId);
  const others = groups.filter((g) => g.authorId !== myUserId);

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      data={others}
      keyExtractor={(g) => g.authorId}
      ListHeaderComponent={
        <Pressable style={styles.item} onPress={() => (myGroup ? onPressGroup(myGroup) : onPressAddStory())}>
          <View>
            <Avatar path={myGroup?.author.avatarPath} size={64} ringState={myGroup ? (myGroup.hasUnseen ? 'unseen' : 'seen') : 'none'} />
            {!myGroup && (
              <View style={[styles.addBadge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                <Text style={styles.addBadgeText}>+</Text>
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>Your story</Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.item} onPress={() => onPressGroup(item)}>
          <Avatar path={item.author.avatarPath} size={64} ringState={item.hasUnseen ? 'unseen' : 'seen'} />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.author.username}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 8, paddingVertical: 10 },
  item: { alignItems: 'center', width: 76 },
  name: { fontSize: 11, marginTop: 4 },
  addBadge: { position: 'absolute', bottom: 0, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  addBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13, lineHeight: 15 },
});
