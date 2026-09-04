import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchAll } from '../../db/repositories/searchRepository';
import { getProfileById } from '../../db/repositories/userRepository';
import { getPostById } from '../../db/repositories/postRepository';
import { getSuggestedAccounts } from '../../db/repositories/userRepository';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme/useTheme';
import type { Author } from '../../types';

interface ResolvedHit {
  id: string;
  type: 'user' | 'post';
  label: string;
  avatarPath?: string;
}

export function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [text, setText] = useState('');
  const [results, setResults] = useState<ResolvedHit[]>([]);
  const [suggested, setSuggested] = useState<Author[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getSuggestedAccounts(session.userId, 10).then(setSuggested);
  }, [session.userId]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const hits = await searchAll(q, 25);
    const resolved: ResolvedHit[] = [];
    for (const hit of hits) {
      if (hit.entity_type === 'user') {
        const profile = await getProfileById(hit.entity_id, session.userId);
        if (profile) resolved.push({ id: profile.id, type: 'user', label: profile.username, avatarPath: profile.avatarPath });
      } else {
        const post = await getPostById(session.userId, hit.entity_id);
        if (post) resolved.push({ id: post.id, type: 'post', label: post.caption || `Post by ${post.author.username}`, avatarPath: post.media[0]?.thumbPath });
      }
    }
    setResults(resolved);
  }, [session.userId]);

  const onChangeText = (v: string) => {
    setText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 150);
  };

  const showingResults = text.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <Input placeholder="Search users and posts" autoCapitalize="none" value={text} onChangeText={onChangeText} style={styles.input} />
      <FlatList
        data={showingResults ? results : suggested.map((a) => ({ id: a.id, type: 'user' as const, label: a.username, avatarPath: a.avatarPath }))}
        keyExtractor={(r) => `${r.type}:${r.id}`}
        ListEmptyComponent={showingResults ? <EmptyState icon="🔍" title="No results" subtitle="Try a different search term." /> : null}
        ListHeaderComponent={!showingResults && suggested.length > 0 ? (
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Suggested accounts</Text>
        ) : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => item.type === 'user' ? navigation.navigate('Profile', { username: item.label }) : navigation.navigate('PostDetail', { postId: item.id })}
          >
            <Avatar path={item.avatarPath} size={44} />
            <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { margin: 12 },
  sectionLabel: { paddingHorizontal: 12, paddingBottom: 4, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingHorizontal: 12 },
  rowText: { flex: 1, fontSize: 14 },
});
