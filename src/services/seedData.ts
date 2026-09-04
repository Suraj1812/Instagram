import { nanoid } from 'nanoid';
import { execute, transaction, nowMs } from '../db/database';
import { getMeta, setMeta } from '../db/repositories/metaRepository';
import { indexEntity } from '../db/repositories/searchRepository';
import { persistBundledAsset, persistBundledVideo } from './mediaStorage';
import { getOrCreateDirectConversation, sendMessage } from '../db/repositories/messageRepository';
import * as Crypto from 'expo-crypto';
import {
  AVATAR_ASSETS, POST_ASSETS, POST_THUMB_ASSETS, STORY_ASSETS, REEL_THUMB_ASSETS, REEL_VIDEO_ASSETS,
} from './seedAssets.generated';

const SEED_FLAG = 'seed_complete';

interface SeedUserSpec { username: string; displayName: string; bio: string }

const SEED_USERS: SeedUserSpec[] = [
  { username: 'maya.codes', displayName: 'Maya Chen', bio: 'building small, shipping often 🛠️' },
  { username: 'theo_travels', displayName: 'Theo Reyes', bio: 'currently: somewhere with bad wifi ✈️' },
  { username: 'luna.bakes', displayName: 'Luna Park', bio: 'sourdough enthusiast 🍞 recipes in bio' },
  { username: 'kai_runs', displayName: 'Kai Osei', bio: 'marathon #4 this fall 🏃' },
  { username: 'ivy.designs', displayName: 'Ivy Novak', bio: 'product design @ small startup' },
  { username: 'remy_shoots', displayName: 'Remy Duval', bio: 'film photography, mostly Kodak' },
  { username: 'nova.plants', displayName: 'Nova Reid', bio: 'plant parent to 47 leafy children 🌿' },
  { username: 'finn_climbs', displayName: 'Finn Walsh', bio: 'send it 🧗' },
  { username: 'aria.paints', displayName: 'Aria Bloom', bio: 'watercolor and coffee ☕️🎨' },
  { username: 'zeke_surfs', displayName: 'Zeke Marlow', bio: 'chasing swells' },
  { username: 'wren.reads', displayName: 'Wren Sato', bio: '52 books in 2026, currently on #31' },
  { username: 'dax_lifts', displayName: 'Dax Coleman', bio: 'progressive overload, one rep at a time' },
];

const CAPTIONS = [
  'good one today', 'this took way longer than expected', 'finally', 'can\'t stop thinking about this light',
  'weekend well spent', 'first try, honestly', 'more of these soon', 'not the plan but I\'ll take it',
  'been sitting on this for a while', 'okay this might be my favorite', 'small win', 'texture study',
  'slow morning', 'chasing the light', 'process shot', 'still figuring this one out',
  'six months of practice', 'unexpected but good', 'exactly how I pictured it', 'trying something new',
  'quiet one', 'back at it', 'in progress', 'done, finally',
];

async function randomHash(): Promise<{ hash: string; salt: string }> {
  const salt = Array.from(Crypto.getRandomBytes(16)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:seed-account-no-login`);
  return { hash, salt };
}

export async function seedIfNeeded(): Promise<void> {
  const done = await getMeta(SEED_FLAG);
  if (done === 'true') return;

  const userIds: string[] = [];
  const now = nowMs();

  // --- Seed users + avatars ---------------------------------------------
  for (let i = 0; i < SEED_USERS.length; i++) {
    const spec = SEED_USERS[i];
    const id = nanoid();
    userIds.push(id);
    const avatarPath = await persistBundledAsset(AVATAR_ASSETS[i % AVATAR_ASSETS.length]);
    const { hash, salt } = await randomHash();
    await execute(
      `INSERT INTO users (id, username, password_hash, password_salt, display_name, avatar_path, bio, is_seed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, spec.username, hash, salt, spec.displayName, avatarPath, spec.bio, now - (SEED_USERS.length - i) * 86400000]
    );
    await indexEntity(id, 'user', `${spec.username} ${spec.displayName}`);
  }

  // --- Follow graph: everyone follows ~4-6 others, so feeds have content --
  await transaction(async (db) => {
    for (let i = 0; i < userIds.length; i++) {
      const followCount = 4 + (i % 3);
      for (let j = 1; j <= followCount; j++) {
        const target = userIds[(i + j) % userIds.length];
        if (target === userIds[i]) continue;
        await db.runAsync(
          `INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
          [userIds[i], target, now - j * 3600000]
        );
      }
    }
    for (const id of userIds) {
      const followers = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM follows WHERE followee_id = ?', [id]);
      const following = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM follows WHERE follower_id = ?', [id]);
      await db.runAsync('UPDATE users SET followers_count = ?, following_count = ? WHERE id = ?', [followers?.n ?? 0, following?.n ?? 0, id]);
    }
  });

  // --- Posts: distribute post images across users ------------------------
  const postIds: string[] = [];
  for (let i = 0; i < POST_ASSETS.length; i++) {
    const authorIdx = i % userIds.length;
    const authorId = userIds[authorIdx];
    const path = await persistBundledAsset(POST_ASSETS[i]);
    const thumbPath = await persistBundledAsset(POST_THUMB_ASSETS[i]);
    const id = nanoid();
    postIds.push(id);
    const createdAt = now - (POST_ASSETS.length - i) * 5400000; // spread over past ~5 days
    await execute(
      `INSERT INTO posts (id, author_id, caption, media_type, media_json, is_reel, created_at) VALUES (?, ?, ?, 'image', ?, 0, ?)`,
      [id, authorId, CAPTIONS[i % CAPTIONS.length], JSON.stringify([{ path, thumbPath, width: 1080, height: i % 2 === 0 ? 1080 : 1350 }]), createdAt]
    );
    await execute('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?', [authorId]);
    if (CAPTIONS[i % CAPTIONS.length]) await indexEntity(id, 'post', CAPTIONS[i % CAPTIONS.length]);
  }

  // --- Likes + comments, randomized but deterministic ---------------------
  await transaction(async (db) => {
    for (let i = 0; i < postIds.length; i++) {
      const likeCount = 3 + ((i * 7) % 9);
      for (let k = 0; k < likeCount; k++) {
        const liker = userIds[(i + k * 3) % userIds.length];
        await db.runAsync('INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [postIds[i], liker, now - k * 60000]);
      }
      if (i % 3 === 0) {
        const commenter = userIds[(i + 2) % userIds.length];
        await db.runAsync(
          'INSERT INTO comments (id, post_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
          [nanoid(), postIds[i], commenter, ['love this', 'this is so good', 'incredible 😍', 'need to try this'][i % 4], now - 1800000]
        );
        await db.runAsync('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [postIds[i]]);
      }
    }
  });

  // --- Reels: a handful of vertical videos ---------------------------------
  for (let i = 0; i < REEL_VIDEO_ASSETS.length; i++) {
    const authorId = userIds[(i * 3) % userIds.length];
    const videoPath = await persistBundledVideo(REEL_VIDEO_ASSETS[i]);
    const thumbPath = await persistBundledAsset(REEL_THUMB_ASSETS[i % REEL_THUMB_ASSETS.length]);
    const id = nanoid();
    await execute(
      `INSERT INTO posts (id, author_id, caption, media_type, media_json, is_reel, created_at) VALUES (?, ?, ?, 'video', ?, 1, ?)`,
      [id, authorId, ['on repeat', 'wait for it', 'good vibes only', 'quick one', 'saved this for later'][i], JSON.stringify([{ path: videoPath, thumbPath, width: 480, height: 854 }]), now - i * 7200000]
    );
    await execute('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?', [authorId]);
  }

  // --- Stories: active (unexpired) stories for most users -----------------
  for (let i = 0; i < STORY_ASSETS.length; i++) {
    const authorId = userIds[i % userIds.length];
    const path = await persistBundledAsset(STORY_ASSETS[i]);
    const createdAt = now - i * 1800000;
    await execute(
      `INSERT INTO stories (id, author_id, media_path, media_type, duration_ms, created_at, expires_at) VALUES (?, ?, ?, 'image', 5000, ?, ?)`,
      [nanoid(), authorId, path, createdAt, createdAt + 24 * 3600000]
    );
  }

  await setMeta(SEED_FLAG, 'true');
  await setMeta('seed_user_ids', JSON.stringify(userIds));
}

/**
 * Called right after a real signup so the brand-new (non-seed) account
 * doesn't open to an empty app: auto-follows a few demo accounts, and drops
 * a welcome DM + notification so Messages/Notifications aren't dead ends.
 */
export async function onboardNewUser(newUserId: string) {
  const raw = await getMeta('seed_user_ids');
  if (!raw) return;
  const seedUserIds: string[] = JSON.parse(raw);
  const toFollow = seedUserIds.slice(0, 5);

  await transaction(async (db) => {
    for (const targetId of toFollow) {
      await db.runAsync(
        'INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
        [newUserId, targetId, nowMs()]
      );
      await db.runAsync('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [targetId]);
    }
    await db.runAsync('UPDATE users SET following_count = ? WHERE id = ?', [toFollow.length, newUserId]);
    await db.runAsync(
      `INSERT INTO notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at) VALUES (?, ?, 'follow', ?, 'user', ?, ?)`,
      [nanoid(), newUserId, seedUserIds[0], newUserId, nowMs()]
    );
  });

  const convoId = await getOrCreateDirectConversation(newUserId, seedUserIds[0]);
  await sendMessage(convoId, seedUserIds[0], "hey! welcome to SwiftGram 👋");
}
