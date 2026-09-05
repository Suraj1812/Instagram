#!/usr/bin/env node
/**
 * Replace the generated-looking demo feed images with real photography.
 *
 * This only updates posts belonging to seed/demo profiles. It does not create
 * duplicate posts and it never changes posts created by a real app user.
 *
 * Run from the project root:
 *   node scripts/replaceSeedPostsWithRealPhotos.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'real-posts');
const REAL_PHOTOS = [
  { file: 'real_01.jpg', caption: 'A road trip worth remembering', width: 1080, height: 1620 },
  { file: 'real_02.jpg', caption: 'A little mountain air', width: 1080, height: 720 },
  { file: 'real_03.jpg', caption: 'City lights and late nights', width: 1080, height: 1351 },
  { file: 'real_04.jpg', caption: 'Dinner is always a good idea', width: 1080, height: 720 },
  { file: 'real_05.jpg', caption: 'Coffee and quiet mornings', width: 1080, height: 720 },
  { file: 'real_06.jpg', caption: 'A little color never hurt', width: 1080, height: 1495 },
  { file: 'real_07.jpg', caption: 'Somewhere peaceful', width: 1080, height: 720 },
  { file: 'real_08.jpg', caption: 'Beach days hit different', width: 1080, height: 718 },
  { file: 'real_09.jpg', caption: 'Ocean therapy', width: 1080, height: 720 },
  { file: 'real_10.jpg', caption: 'Postcard from the road', width: 1080, height: 720 },
  { file: 'real_11.jpg', caption: 'New places, new perspective', width: 1080, height: 810 },
  { file: 'real_12.jpg', caption: 'Taking the long way home', width: 1080, height: 1620 },
];

async function uploadPhoto(photo) {
  const localPath = path.join(ASSETS_DIR, photo.file);
  if (!fs.existsSync(localPath)) throw new Error(`Missing ${localPath}`);

  const storagePath = `demo-real/${photo.file}`;
  const buffer = fs.readFileSync(localPath);
  const { error } = await admin.storage.from('posts').upload(storagePath, buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${photo.file}: ${error.message}`);

  const { data } = admin.storage.from('posts').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const { data: seedProfiles, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('is_seed', true);
  if (profileError) throw profileError;

  const seedIds = (seedProfiles || []).map((profile) => profile.id);
  if (!seedIds.length) throw new Error('No seed/demo profiles found. Run scripts/seed.js first.');

  const { data: posts, error: postError } = await admin
    .from('posts')
    .select('id, created_at')
    .in('author_id', seedIds)
    .eq('is_reel', false)
    .eq('media_type', 'image')
    .order('created_at', { ascending: true });
  if (postError) throw postError;
  if (!posts?.length) throw new Error('No demo image posts found.');

  console.log(`Updating ${posts.length} demo posts with ${REAL_PHOTOS.length} real photos...`);
  const urls = new Map();
  for (const photo of REAL_PHOTOS) {
    urls.set(photo.file, await uploadPhoto(photo));
  }

  for (let index = 0; index < posts.length; index += 1) {
    const photo = REAL_PHOTOS[index % REAL_PHOTOS.length];
    const url = urls.get(photo.file);
    const { error } = await admin
      .from('posts')
      .update({
        caption: photo.caption,
        media_json: [{ path: url, thumbPath: url, width: photo.width, height: photo.height }],
      })
      .eq('id', posts[index].id);
    if (error) throw error;
  }

  console.log(`Done. ${posts.length} demo posts now use real photography.`);
}

main().catch((error) => {
  console.error('\nReal-photo replacement failed:', error.message);
  process.exit(1);
});
