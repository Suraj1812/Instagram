import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFollowers, getFollowing } from '../../db/repositories/userRepository';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/useTheme';
import { LoadingState } from '../../components/LoadingState';
import type { Author } from '../../types';

export function FollowersScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { userId, mode }: { userId: string; mode: 'followers' | 'following' } = route.params;
  const [list, setList] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (mode === 'followers' ? getFollowers(userId) : getFollowing(userId))
      .then(setList)
      .catch((error: any) => Alert.alert('Could not load list', error?.message ?? 'Please try again.'))
      .finally(() => setLoading(false));
  }, [userId, mode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Text style={[styles.header, { color: colors.text }]}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
      {loading ? <LoadingState label={`Loading ${mode}…`} /> : <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        ListEmptyComponent={<EmptyState icon="people-outline" title={mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('Profile', { username: item.username })}>
            <Avatar path={item.avatarPath} size={44} />
            <View>
              <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
              {!!item.displayName && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.displayName}</Text>}
            </View>
          </Pressable>
        )}
      />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 17, fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  username: { fontWeight: '600', fontSize: 14 },
});
