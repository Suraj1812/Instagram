#!/usr/bin/env node
/**
 * Adds a large, realistic demo network without bundling media into the app.
 * Only profiles marked is_seed=true are changed; real user profiles are left alone.
 * Media is fetched once and stored in Supabase Storage.
 *
 * Run from the project root:
 *   node scripts/seedRealDemoContent.js
 */
require('dotenv').config();

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PHOTO_IDS = [
  '1493106819501-66d381c466f1', '1496672254107-b07a26403885', '1504275490777-45f30792f13f',
  '1506863530036-1efeddceb993', '1516239482977-b550ba7253f2', '1517462964-21fdcec3f25b',
  '1533933269825-da140ad3132f', '1544005313-94ddf0286df2', '1558499932-9609acb6f443',
  '1563170446-9c3c0622d8a9', '1574526783053-c3afac70d448', '1581841064838-a470c740e8ee',
  '1587397845856-e6cf49176c70', '1617744966315-b3c950c430c7', '1674932668403-33398b81c92f',
  '1429292394373-ddbcc6bb7468', '1438761681033-6461ffad8d80', '1444210971048-6130cf0c46cf',
  '1454923634634-bd1614719a7b', '1469854523086-cc02fe5d8800', '1476514525535-07fb3b4ae5f1',
  '1487452066049-a710f7296400', '1488034976201-ffbaa99cbf5c', '1488085061387-422e29b40080',
  '1488161628813-04466f872be2', '1491438590914-bc09fcaaf77a', '1494790108377-be9c29b29330',
  '1500027014421-46ccc843776a', '1500835556837-99ac94a94552', '1501785888041-af3ef285b470',
  '1501959915551-4e8d30928317', '1504150558240-0b4fd8946624', '1506126613408-eca07ce68773',
  '1506790144-fe3c68e4247d', '1506869640319-fe1a24fd76dc', '1507003211169-0a1dd7228f2d',
  '1507608616759-54f48f0af0ee', '1511632765486-a01980e01a18', '1511988617509-a57c8a288659',
  '1513171920216-2640b288471b', '1513682121497-80211f36a7d3', '1516483638261-f4dbaf036963',
  '1517487881594-2787fef5ebf7', '1517586979036-b7d1e86b3345', '1517732306149-e8f829eb588a',
  '1517841905240-472988babdf9', '1522897048979-e407743f3603', '1524504388940-b1c1722653e1',
];

const VIDEO_URLS = [
  'https://assets.mixkit.co/videos/32809/32809-360.mp4',
  'https://assets.mixkit.co/videos/44542/44542-360.mp4',
  'https://assets.mixkit.co/videos/43270/43270-360.mp4',
  'https://assets.mixkit.co/videos/3672/3672-360.mp4',
  'https://assets.mixkit.co/videos/4950/4950-360.mp4',
  'https://assets.mixkit.co/videos/32807/32807-360.mp4',
  'https://assets.mixkit.co/videos/43391/43391-360.mp4',
  'https://assets.mixkit.co/videos/40246/40246-360.mp4',
];

const CAPTIONS = [
  'A slow morning and a little sunlight ☀️', 'Found a new favorite corner of the city',
  'Weekend plans: good food and better company', 'The kind of day worth remembering',
  'Small details, big mood', 'Coffee first, everything else after',
  'Taking the scenic route home', 'A little color for the feed',
  'Out here collecting ordinary magic', 'No plans, just good energy',
  'This view never gets old', 'Made time for the things that matter',
  'Golden hour did all the work', 'A fresh start feels good',
  'Good people make good memories', 'Somewhere between here and nowhere',
];

const VIDEO_CAPTIONS = [
  'Come with me for a minute', 'A tiny bit of movement from today',
  'The city is always in motion', 'Just enjoying the moment',
  'One of those unexpectedly good days', 'Little joys, captured',
  'POV: you finally go outside', 'Saving this one forever',
];

const PHOTO_URL = (id, options = {}) => {
  const params = new URLSearchParams({ auto: 'format', fit: 'crop', fm: 'jpg', q: '82', w: String(options.w || 1080) });
  if (options.h) params.set('h', String(options.h));
  if (options.faces) params.set('crop', 'faces');
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`;
};

const contentId = (prefix, index) => `showcase_${prefix}_${String(index + 1).padStart(2, '0')}`;

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while downloading ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function upload(bucket, path, url, contentType) {
  const buffer = await fetchBuffer(url);
  const { error } = await admin.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload ${bucket}/${path} failed: ${error.message}`);
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function upsertPost(row) {
  const { error } = await admin.from('posts').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

async function main() {
  const now = Date.now();
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, username, display_name')
    .eq('is_seed', true)
    .order('created_at', { ascending: true });
  if (profileError) throw profileError;
  if (!profiles?.length) throw new Error('No demo profiles found (profiles.is_seed=true).');

  console.log(`Found ${profiles.length} demo profiles. Downloading hosted media...`);

  const photoUrls = [];
  for (let index = 0; index < PHOTO_IDS.length; index += 1) {
    const id = PHOTO_IDS[index];
    const url = PHOTO_URL(id, { h: index % 3 === 0 ? 1350 : index % 3 === 1 ? 720 : 1080 });
    const publicUrl = await upload('posts', `showcase/photos/photo_${String(index + 1).padStart(2, '0')}.jpg`, url, 'image/jpeg');
    photoUrls.push(publicUrl);
    if ((index + 1) % 8 === 0) console.log(`  uploaded ${index + 1}/${PHOTO_IDS.length} photos`);
  }

  for (let index = 0; index < profiles.length; index += 1) {
    const profile = profiles[index];
    const avatarUrl = await upload(
      'avatars',
      `showcase/${profile.id}.jpg`,
      PHOTO_URL(PHOTO_IDS[(index + 24) % PHOTO_IDS.length], { w: 320, h: 320, faces: true }),
      'image/jpeg',
    );
    const { error } = await admin.from('profiles').update({ avatar_path: avatarUrl }).eq('id', profile.id);
    if (error) throw error;
  }
  console.log(`Updated ${profiles.length} demo avatars.`);

  const postIds = [];
  for (let index = 0; index < photoUrls.length; index += 1) {
    const author = profiles[index % profiles.length];
    const height = index % 3 === 0 ? 1350 : index % 3 === 1 ? 720 : 1080;
    const id = contentId('photo', index);
    postIds.push(id);
    await upsertPost({
      id,
      author_id: author.id,
      caption: CAPTIONS[index % CAPTIONS.length],
      media_type: 'image',
      media_json: [{ path: photoUrls[index], thumbPath: photoUrls[index], width: 1080, height }],
      is_reel: false,
      created_at: now - index * 45 * 60 * 1000,
    });
  }

  const videoUrls = [];
  for (let index = 0; index < VIDEO_URLS.length; index += 1) {
    const publicUrl = await upload('posts', `showcase/videos/video_${String(index + 1).padStart(2, '0')}.mp4`, VIDEO_URLS[index], 'video/mp4');
    videoUrls.push(publicUrl);
    console.log(`  uploaded video ${index + 1}/${VIDEO_URLS.length}`);
  }

  for (let index = 0; index < videoUrls.length; index += 1) {
    const author = profiles[(index * 2 + 1) % profiles.length];
    await upsertPost({
      id: contentId('reel', index),
      author_id: author.id,
      caption: VIDEO_CAPTIONS[index],
      media_type: 'video',
      media_json: [{ path: videoUrls[index], thumbPath: photoUrls[(index * 5) % photoUrls.length], width: 360, height: 640 }],
      is_reel: true,
      created_at: now - index * 75 * 60 * 1000,
    });
  }

  for (let index = 0; index < profiles.length; index += 1) {
    const author = profiles[index];
    const storyId = contentId('story', index);
    const createdAt = now - index * 20 * 60 * 1000;
    const isVideo = index % 3 === 0;
    const { error } = await admin.from('stories').upsert({
      id: storyId,
      author_id: author.id,
      media_path: isVideo ? videoUrls[index % videoUrls.length] : photoUrls[(index * 3) % photoUrls.length],
      media_type: isVideo ? 'video' : 'image',
      duration_ms: isVideo ? 7000 : 5000,
      created_at: createdAt,
      expires_at: createdAt + 24 * 60 * 60 * 1000,
    }, { onConflict: 'id' });
    if (error) throw error;
  }

  // Give the new showcase posts believable engagement from the demo graph.
  for (let index = 0; index < postIds.length; index += 1) {
    const postId = postIds[index];
    const likes = 4 + (index % 8);
    for (let offset = 0; offset < likes; offset += 1) {
      const liker = profiles[(index + offset * 2) % profiles.length];
      const { error } = await admin.from('likes').upsert({
        post_id: postId,
        user_id: liker.id,
        created_at: now - offset * 90 * 1000,
      }, { onConflict: 'post_id,user_id' });
      if (error) throw error;
    }
  }

  const { count: postCount, error: countError } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .in('author_id', profiles.map((profile) => profile.id));
  if (countError) throw countError;
  const { count: storyCount, error: storyCountError } = await admin
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .in('author_id', profiles.map((profile) => profile.id))
    .gt('expires_at', now);
  if (storyCountError) throw storyCountError;

  console.log(`Done: ${photoUrls.length} image posts, ${videoUrls.length} reels, ${profiles.length} active stories.`);
  console.log(`Verified backend totals: ${postCount} demo posts, ${storyCount} active demo stories.`);
}

main().catch((error) => {
  console.error(`\nReal demo content seed failed: ${error.message}`);
  process.exit(1);
});
