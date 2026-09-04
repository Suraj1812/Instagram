import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPostById, toggleLike, toggleSave } from '../../db/repositories/postRepository';
import { getComments, addComment } from '../../db/repositories/commentRepository';
import { useAuthStore } from '../../store/authStore';
import { PostCard } from '../../components/PostCard';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/useTheme';
import { Pressable } from 'react-native';
import type { Post, Comment } from '../../types';

export function PostDetailScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([getPostById(session.userId, postId), getComments(postId)]);
    setPost(p);
    setComments(c);
  }, [postId, session.userId]);

  useEffect(() => { load(); }, [load]);

  const onLike = async () => {
    if (!post) return;
    const nextLiked = !post.likedByMe;
    setPost({ ...post, likedByMe: nextLiked, likeCount: post.likeCount + (nextLiked ? 1 : -1) });
    await toggleLike(session.userId, post.id, nextLiked);
  };
  const onSave = async () => {
    if (!post) return;
    const nextSaved = !post.savedByMe;
    setPost({ ...post, savedByMe: nextSaved });
    await toggleSave(session.userId, post.id, nextSaved);
  };

  const onSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    const c = await addComment(postId, session.userId, text);
    setComments((prev) => [...prev, c]);
    setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
  };

  if (!post) return <View style={[styles.container, { backgroundColor: colors.bg }]} />;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <PostCard
              post={post}
              onToggleLike={onLike}
              onToggleSave={onSave}
              onPressComments={() => {}}
              onPressProfile={(username) => navigation.navigate('Profile', { username })}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Avatar path={item.author.avatarPath} size={28} />
              <Text style={[styles.commentText, { color: colors.text }]}>
                <Text style={styles.commentUser}>{item.author.username} </Text>
                {item.body}
              </Text>
            </View>
          )}
        />
        <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
          <Input placeholder="Add a comment…" value={draft} onChangeText={setDraft} style={{ flex: 1 }} />
          <Pressable onPress={onSend} disabled={!draft.trim()} style={{ marginLeft: 10 }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>Post</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  commentRow: { flexDirection: 'row', gap: 10, padding: 10, alignItems: 'flex-start' },
  commentUser: { fontWeight: '600' },
  commentText: { flex: 1, fontSize: 13, lineHeight: 18 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
