export interface MediaItem {
  path: string;
  thumbPath?: string;
  width: number;
  height: number;
}

export interface Author {
  id: string;
  username: string;
  displayName?: string;
  avatarPath?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: Author;
  caption: string;
  mediaType: 'image' | 'video' | 'carousel';
  media: MediaItem[];
  isReel: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarPath?: string;
  bio?: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowedByMe: boolean;
  isMe: boolean;
}

export interface StoryItem {
  id: string;
  authorId: string;
  mediaPath: string;
  mediaType: 'image' | 'video';
  durationMs: number;
  createdAt: number;
  expiresAt: number;
  viewedByMe: boolean;
}

export interface StoryGroup {
  authorId: string;
  author: Author;
  hasUnseen: boolean;
  stories: StoryItem[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: Author;
  body: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body?: string;
  mediaPath?: string;
  createdAt: number;
  readAt?: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  otherUser?: Author;
  lastBody?: string;
  updatedAt: number;
  unreadCount: number;
}

export interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  actor: Author;
  targetType?: 'post' | 'comment' | 'user';
  targetId?: string;
  isRead: boolean;
  createdAt: number;
}
