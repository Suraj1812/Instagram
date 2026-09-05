import { nanoid } from 'nanoid';
import { supabase } from '../../services/supabaseClient';
import type { Comment } from '../../types';

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, author_id, body, created_at, profiles!comments_author_id_fkey(username, display_name, avatar_path)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    postId: r.post_id,
    authorId: r.author_id,
    author: {
      id: r.author_id,
      username: r.profiles.username,
      displayName: r.profiles.display_name ?? undefined,
      avatarPath: r.profiles.avatar_path ?? undefined,
    },
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function addComment(postId: string, authorId: string, body: string): Promise<Comment> {
  const id = nanoid();
  const createdAt = Date.now();
  const { error } = await supabase.from('comments').insert({ id, post_id: postId, author_id: authorId, body, created_at: createdAt });
  if (error) throw new Error(error.message);

  const { data: author, error: authorErr } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_path')
    .eq('id', authorId)
    .single();
  if (authorErr) throw new Error(authorErr.message);

  return {
    id, postId, authorId,
    author: { id: author.id, username: author.username, displayName: author.display_name ?? undefined, avatarPath: author.avatar_path ?? undefined },
    body, createdAt,
  };
}

export async function deleteComment(commentId: string, _postId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}
