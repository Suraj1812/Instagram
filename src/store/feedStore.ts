import { create } from 'zustand';
import * as postRepo from '../db/repositories/postRepository';
import type { Post } from '../types';

interface FeedState {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  load: (meUserId: string) => Promise<void>;
  loadMore: (meUserId: string) => Promise<void>;
  toggleLike: (meUserId: string, postId: string) => Promise<void>;
  toggleSave: (meUserId: string, postId: string) => Promise<void>;
  prependNewPost: (post: Post) => void;
}

const PAGE_SIZE = 8;

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  loading: true,
  loadingMore: false,
  hasMore: true,
  error: null,

  load: async (meUserId) => {
    set({ loading: true, error: null });
    try {
      const posts = await postRepo.getFeedPage(meUserId, null, PAGE_SIZE);
      set({ posts, loading: false, hasMore: posts.length === PAGE_SIZE });
    } catch (error: any) {
      set({ posts: [], loading: false, hasMore: false, error: error?.message ?? 'Could not load your feed.' });
    }
  },

  loadMore: async (meUserId) => {
    const { posts, loadingMore, hasMore } = get();
    if (loadingMore || !hasMore || posts.length === 0) return;
    set({ loadingMore: true });
    try {
      const oldest = posts[posts.length - 1].createdAt;
      const next = await postRepo.getFeedPage(meUserId, oldest, PAGE_SIZE);
      set({ posts: [...posts, ...next], loadingMore: false, hasMore: next.length === PAGE_SIZE });
    } catch (error: any) {
      set({ loadingMore: false, error: error?.message ?? 'Could not load more posts.' });
    }
  },

  toggleLike: async (meUserId, postId) => {
    const { posts } = get();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    const nextLiked = !posts[idx].likedByMe;
    const updated = [...posts];
    updated[idx] = { ...posts[idx], likedByMe: nextLiked, likeCount: posts[idx].likeCount + (nextLiked ? 1 : -1) };
    set({ posts: updated }); // instant UI flip
    await postRepo.toggleLike(meUserId, postId, nextLiked); // persist
  },

  toggleSave: async (meUserId, postId) => {
    const { posts } = get();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    const nextSaved = !posts[idx].savedByMe;
    const updated = [...posts];
    updated[idx] = { ...posts[idx], savedByMe: nextSaved };
    set({ posts: updated });
    await postRepo.toggleSave(meUserId, postId, nextSaved);
  },

  prependNewPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
}));
