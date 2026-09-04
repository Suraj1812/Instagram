// AUTO-GENERATED at build time from src/db/schema.sql. Do not edit by hand.
export const SCHEMA_SQL = `-- ============================================================================
-- SwiftGram — fully local database. There is no server: this schema is the
-- entire persistence layer for the app. Every screen reads/writes here and
-- nothing else. All media referenced here lives on-device (see mediaStorage).
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- Local accounts. Multiple accounts can exist on one device (e.g. a demo
-- seed user plus one you create at signup); only one is "current" at a time,
-- tracked via kv_meta('current_user_id') + a session flag in SecureStore.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  display_name    TEXT,
  avatar_path     TEXT,             -- file:// path in app document storage
  bio             TEXT,
  is_private      INTEGER DEFAULT 0,
  is_seed         INTEGER DEFAULT 0, -- demo accounts created by the seeder
  followers_count INTEGER DEFAULT 0, -- denormalized for instant profile reads
  following_count INTEGER DEFAULT 0,
  posts_count     INTEGER DEFAULT 0,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,
  author_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption         TEXT,
  media_type      TEXT NOT NULL,     -- 'image' | 'video' | 'carousel'
  media_json      TEXT NOT NULL,     -- JSON array of {path, thumbPath, width, height}
  is_reel         INTEGER DEFAULT 0, -- vertical short-video feed item
  comment_count   INTEGER DEFAULT 0,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reel ON posts(is_reel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- Likes are their own table (not a flag on posts) so multiple local accounts
-- each have independent like state, and counts are always derivable/correct.
CREATE TABLE IF NOT EXISTS likes (
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

CREATE TABLE IF NOT EXISTS saves (
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

CREATE TABLE IF NOT EXISTS stories (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_path  TEXT NOT NULL,
  media_type  TEXT NOT NULL,        -- 'image' | 'video'
  duration_ms INTEGER DEFAULT 5000,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

CREATE TABLE IF NOT EXISTS story_views (
  story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at   INTEGER NOT NULL,
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  is_group        INTEGER DEFAULT 0,
  title           TEXT,
  last_message_id TEXT,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id),
  body            TEXT,
  media_path      TEXT,
  created_at      INTEGER NOT NULL,
  read_at         INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,        -- 'like' | 'comment' | 'follow' | 'mention'
  actor_id    TEXT NOT NULL REFERENCES users(id),
  target_type TEXT,                 -- 'post' | 'comment' | 'user'
  target_id   TEXT,
  is_read     INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, created_at DESC);

-- Full-text search over usernames, display names, and captions.
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_id UNINDEXED, entity_type UNINDEXED, text
);

-- Generic local key/value store: onboarding flag, theme mode, current
-- session user id, feature flags, etc.
CREATE TABLE IF NOT EXISTS kv_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;
