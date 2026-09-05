import { supabase } from '../../services/supabaseClient';
import { nanoid } from 'nanoid';
import type { Post, MediaItem } from '../../types';

interface PostRow {
  id: string; author_id: string; caption: string | null; media_type: string; media_json: MediaItem[];
  is_reel: boolean; comment_count: number; created_at: number;
  username: string; display_name: string | null; avatar_path: string | null;
  like_count: number; liked_by_me: boolean; saved_by_me: boolean;
}

function rowToPost(r: PostRow): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    author: { id: r.author_id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined },
    caption: r.caption ?? '',
    mediaType: r.media_type as Post['mediaType'],
    media: r.media_json,
    isReel: r.is_reel,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    likedByMe: r.liked_by_me,
    savedByMe: r.saved_by_me,
    createdAt: r.created_at,
  };
}

function unwrap<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Home feed: posts from people you follow (plus your own), newest first. meUserId kept for call-site compatibility — the server reads the real caller from the auth token. */
export async function getFeedPage(_meUserId: string, beforeTs: number | null, limit = 10): Promise<Post[]> {
  const cursor = beforeTs ?? Date.now() + 1;
  const res = await supabase.rpc('get_feed_page', { before_ts: cursor, page_limit: limit });
  return unwrap<PostRow[]>(res).map(rowToPost);
}

/** Explore grid: everything not from people you already follow, most-liked-ish ordering. */
export async function getExplorePage(_meUserId: string, offset: number, limit = 24): Promise<Post[]> {
  const res = await supabase.rpc('get_explore_page', { page_offset: offset, page_limit: limit });
  return unwrap<PostRow[]>(res).map(rowToPost);
}

/** Reels feed: vertical short videos, newest first across everyone. */
export async function getReelsPage(_meUserId: string, beforeTs: number | null, limit = 6): Promise<Post[]> {
  const cursor = beforeTs ?? Date.now() + 1;
  const res = await supabase.rpc('get_reels_page', { before_ts: cursor, page_limit: limit });
  return unwrap<PostRow[]>(res).map(rowToPost);
}

export async function getUserPosts(_meUserId: string, authorId: string, reelsOnly = false): Promise<Post[]> {
  const res = await supabase.rpc('get_user_posts', { target_author_id: authorId, reels_only: reelsOnly });
  return unwrap<PostRow[]>(res).map(rowToPost);
}

export async function getSavedPosts(_meUserId: string): Promise<Post[]> {
  const res = await supabase.rpc('get_saved_posts');
  return unwrap<PostRow[]>(res).map(rowToPost);
}

export async function getPostById(_meUserId: string, id: string): Promise<Post | null> {
  const res = await supabase.rpc('get_post_by_id', { target_post_id: id });
  const rows = unwrap<PostRow[]>(res);
  return rows[0] ? rowToPost(rows[0]) : null;
}

/**
 * Toggling a like is a single-row insert/delete — Postgres triggers handle
 * the notification server-side, so the client just persists the fact.
 */
export async function toggleLike(userId: string, postId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from('likes').upsert({ post_id: postId, user_id: userId, created_at: Date.now() });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

export async function toggleSave(userId: string, postId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase.from('saves').upsert({ post_id: postId, user_id: userId, created_at: Date.now() });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('saves').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}

export async function createPost(input: {
  authorId: string; caption: string; mediaType: Post['mediaType']; media: MediaItem[]; isReel: boolean;
}): Promise<string> {
  const id = nanoid();
  const { error } = await supabase.from('posts').insert({
    id,
    author_id: input.authorId,
    caption: input.caption,
    media_type: input.mediaType,
    media_json: input.media,
    is_reel: input.isReel,
    created_at: Date.now(),
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function deletePost(postId: string, _authorId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
}
