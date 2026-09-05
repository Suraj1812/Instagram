#!/usr/bin/env node
/**
 * One-time demo-data seeder for SwiftGram's Supabase backend.
 *
 * Populates ~12 demo accounts, a follow graph, posts, reels, stories, likes
 * and comments — the same believable demo network the local-SQLite version
 * used to generate on first launch, except now it's centralized: every real
 * user who signs up sees the *same* shared demo network (via the
 * `onboard_new_user` Postgres function), instead of each device generating
 * its own throwaway copy.
 *
 * Run once, from your own machine (needs real internet access):
 *
 *   node scripts/seed.js
 *
 * Requires, in a `.env` file at the project root (next to package.json):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...           <- Project Settings -> API -> "service_role" secret
 *
 * The service role key bypasses Row Level Security entirely — that's what
 * lets this script write data as 12 different "users" without signing in as
 * each one. It is NOT the same as the anon key the app itself uses, never
 * put it in EXPO_PUBLIC_* (that would ship it inside the app bundle!), and
 * it's safest to remove that line from `.env` again once this has run.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see the comment at the top of this file.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'seed');
const SEED_PASSWORD = 'swiftgram-seed-2026'; // fixed & documented — these are throwaway demo accounts, not real users
const id = () => crypto.randomBytes(9).toString('hex');
const now = Date.now();

const SEED_USERS = [
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
  'good one today', 'this took way longer than expected', 'finally', "can't stop thinking about this light",
  'weekend well spent', 'first try, honestly', 'more of these soon', "not the plan but I'll take it",
  'been sitting on this for a while', 'okay this might be my favorite', 'small win', 'texture study',
  'slow morning', 'chasing the light', 'process shot', "still figuring this one out",
  'six months of practice', 'unexpected but good', 'exactly how I pictured it', 'trying something new',
  'quiet one', 'back at it', 'in progress', 'done, finally',
];

function countFiles(prefix, ext) {
  let n = 0;
  while (fs.existsSync(path.join(ASSETS_DIR, `${prefix}${n}${ext}`))) n++;
  return n;
}

async function uploadAsset(bucket, destName, localPath, contentType) {
  const buf = fs.readFileSync(localPath);
  const { error } = await admin.storage.from(bucket).upload(destName, buf, { contentType, upsert: true });
  if (error) throw new Error(`upload ${localPath} -> ${bucket}/${destName}: ${error.message}`);
  const { data } = admin.storage.from(bucket).getPublicUrl(destName);
  return data.publicUrl;
}

async function main() {
  console.log(`Seeding against ${SUPABASE_URL} ...`);

  const AVATAR_COUNT = countFiles('avatar_', '.jpg');
  const POST_COUNT = countFiles('post_', '.jpg');
  const REEL_COUNT = countFiles('reel_', '.mp4');
  const STORY_COUNT = countFiles('story_', '.jpg');
  console.log(`Found ${AVATAR_COUNT} avatars, ${POST_COUNT} posts, ${REEL_COUNT} reels, ${STORY_COUNT} stories in assets/seed/`);

  // --- Users + avatars -------------------------------------------------
  const userIds = [];
  for (let i = 0; i < SEED_USERS.length; i++) {
    const spec = SEED_USERS[i];
    const email = `${spec.username}@swiftgram.local`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { username: spec.username, display_name: spec.displayName },
    });
    if (error) {
      if (String(error.message).toLowerCase().includes('already been registered')) {
        console.log(`  - ${spec.username} already exists, skipping creation`);
        const { data: existing } = await admin.from('profiles').select('id').eq('username', spec.username).maybeSingle();
        if (existing) userIds.push(existing.id);
        continue;
      }
      throw error;
    }
    const userId = created.user.id;
    userIds.push(userId);

    const avatarLocal = path.join(ASSETS_DIR, `avatar_${i % AVATAR_COUNT}.jpg`);
    const avatarUrl = await uploadAsset('avatars', `${userId}.jpg`, avatarLocal, 'image/jpeg');

    await admin.from('profiles').update({
      is_seed: true,
      bio: spec.bio,
      avatar_path: avatarUrl,
      created_at: now - (SEED_USERS.length - i) * 86400000,
    }).eq('id', userId);

    console.log(`  + created ${spec.username}`);
  }

  // --- Follow graph: everyone follows ~4-6 others ------------------------
  console.log('Building follow graph...');
  for (let i = 0; i < userIds.length; i++) {
    const followCount = 4 + (i % 3);
    for (let j = 1; j <= followCount; j++) {
      const target = userIds[(i + j) % userIds.length];
      if (target === userIds[i]) continue;
      await admin.from('follows').upsert({ follower_id: userIds[i], followee_id: target, created_at: now - j * 3600000 });
    }
  }

  // --- Posts ---------------------------------------------------------------
  console.log('Uploading posts...');
  const postIds = [];
  for (let i = 0; i < POST_COUNT; i++) {
    const authorId = userIds[i % userIds.length];
    const imgUrl = await uploadAsset('posts', `post_${i}_${id()}.jpg`, path.join(ASSETS_DIR, `post_${i}.jpg`), 'image/jpeg');
    const thumbLocal = path.join(ASSETS_DIR, `post_${i}_thumb.jpg`);
    const thumbUrl = fs.existsSync(thumbLocal) ? await uploadAsset('posts', `post_${i}_thumb_${id()}.jpg`, thumbLocal, 'image/jpeg') : imgUrl;
    const postId = id();
    postIds.push(postId);
    const createdAt = now - (POST_COUNT - i) * 5400000;
    await admin.from('posts').insert({
      id: postId, author_id: authorId, caption: CAPTIONS[i % CAPTIONS.length], media_type: 'image',
      media_json: [{ path: imgUrl, thumbPath: thumbUrl, width: 1080, height: i % 2 === 0 ? 1080 : 1350 }],
      is_reel: false, created_at: createdAt,
    });
  }

  // --- Likes + comments -----------------------------------------------------
  console.log('Adding likes and comments...');
  for (let i = 0; i < postIds.length; i++) {
    const likeCount = 3 + ((i * 7) % 9);
    for (let k = 0; k < likeCount; k++) {
      const liker = userIds[(i + k * 3) % userIds.length];
      await admin.from('likes').upsert({ post_id: postIds[i], user_id: liker, created_at: now - k * 60000 });
    }
    if (i % 3 === 0) {
      const commenter = userIds[(i + 2) % userIds.length];
      await admin.from('comments').insert({
        id: id(), post_id: postIds[i], author_id: commenter,
        body: ['love this', 'this is so good', 'incredible 😍', 'need to try this'][i % 4],
        created_at: now - 1800000,
      });
    }
  }

  // --- Reels -----------------------------------------------------------------
  console.log('Uploading reels...');
  const REEL_CAPTIONS = ['on repeat', 'wait for it', 'good vibes only', 'quick one', 'saved this for later'];
  for (let i = 0; i < REEL_COUNT; i++) {
    const authorId = userIds[(i * 3) % userIds.length];
    const videoUrl = await uploadAsset('posts', `reel_${i}_${id()}.mp4`, path.join(ASSETS_DIR, `reel_${i}.mp4`), 'video/mp4');
    const thumbLocal = path.join(ASSETS_DIR, `reel_thumb_${i % 10}.jpg`);
    const thumbUrl = fs.existsSync(thumbLocal) ? await uploadAsset('posts', `reel_thumb_${i}_${id()}.jpg`, thumbLocal, 'image/jpeg') : videoUrl;
    await admin.from('posts').insert({
      id: id(), author_id: authorId, caption: REEL_CAPTIONS[i % REEL_CAPTIONS.length], media_type: 'video',
      media_json: [{ path: videoUrl, thumbPath: thumbUrl, width: 480, height: 854 }],
      is_reel: true, created_at: now - i * 7200000,
    });
  }

  // --- Stories -----------------------------------------------------------------
  console.log('Uploading stories...');
  for (let i = 0; i < STORY_COUNT; i++) {
    const authorId = userIds[i % userIds.length];
    const url = await uploadAsset('stories', `story_${i}_${id()}.jpg`, path.join(ASSETS_DIR, `story_${i}.jpg`), 'image/jpeg');
    const createdAt = now - i * 1800000;
    await admin.from('stories').insert({
      id: id(), author_id: authorId, media_path: url, media_type: 'image',
      duration_ms: 5000, created_at: createdAt, expires_at: createdAt + 24 * 3600000,
    });
  }

  console.log(`\nDone. Seeded ${userIds.length} demo accounts, ${postIds.length} posts, ${REEL_COUNT} reels, ${STORY_COUNT} stories.`);
  console.log('Any real user who signs up in the app now auto-follows a few of these and gets a welcome DM.');
}

main().catch((err) => {
  console.error('\nSeed script failed:', err.message);
  process.exit(1);
});
