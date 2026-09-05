import { supabase } from '../../services/supabaseClient';
import type { UserProfile, Author } from '../../types';

interface ProfileRow {
  id: string; username: string; display_name: string | null; avatar_path: string | null; bio: string | null;
  is_private: boolean; followers_count: number; following_count: number; posts_count: number;
}

function rowToProfile(r: ProfileRow, meUserId: string, isFollowedByMe: boolean): UserProfile {
  return {
    id: r.id, username: r.username, displayName: r.display_name ?? undefined, avatarPath: r.avatar_path ?? undefined,
    bio: r.bio ?? undefined, isPrivate: r.is_private, followersCount: r.followers_count,
    followingCount: r.following_count, postsCount: r.posts_count,
    isFollowedByMe, isMe: r.id === meUserId,
  };
}

async function isFollowedBy(meUserId: string, targetId: string): Promise<boolean> {
  const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', meUserId).eq('followee_id', targetId).maybeSingle();
  return !!data;
}

export async function getProfileByUsername(username: string, meUserId: string): Promise<UserProfile | null> {
  const { data: row, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const followed = await isFollowedBy(meUserId, row.id);
  return rowToProfile(row as ProfileRow, meUserId, followed);
}

export async function getProfileById(id: string, meUserId: string): Promise<UserProfile | null> {
  const { data: row, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const followed = await isFollowedBy(meUserId, row.id);
  return rowToProfile(row as ProfileRow, meUserId, followed);
}

export async function toggleFollow(myUserId: string, targetUserId: string, follow: boolean) {
  if (follow) {
    const { error } = await supabase.from('follows').upsert({ follower_id: myUserId, followee_id: targetUserId, created_at: Date.now() });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('follows').delete().eq('follower_id', myUserId).eq('followee_id', targetUserId);
    if (error) throw new Error(error.message);
  }
}

export async function getFollowers(userId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_follower_id_fkey(id, username, display_name, avatar_path)')
    .eq('followee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.profiles.id, username: r.profiles.username, displayName: r.profiles.display_name, avatarPath: r.profiles.avatar_path }));
}

export async function getFollowing(userId: string): Promise<Author[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_followee_id_fkey(id, username, display_name, avatar_path)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.profiles.id, username: r.profiles.username, displayName: r.profiles.display_name, avatarPath: r.profiles.avatar_path }));
}

/** Suggested accounts: users you don't already follow (drives Explore's "suggested" row and Search default state). */
export async function getSuggestedAccounts(_meUserId: string, limit = 10): Promise<Author[]> {
  const { data, error } = await supabase.rpc('get_suggested_accounts', { page_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path }));
}

export async function updateProfile(userId: string, updates: { displayName?: string; bio?: string; avatarPath?: string; isPrivate?: boolean }) {
  const patch: Record<string, any> = {};
  if (updates.displayName !== undefined) patch.display_name = updates.displayName;
  if (updates.bio !== undefined) patch.bio = updates.bio;
  if (updates.avatarPath !== undefined) patch.avatar_path = updates.avatarPath;
  if (updates.isPrivate !== undefined) patch.is_private = updates.isPrivate;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}
