import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { decode } from 'base64-arraybuffer';
import { nanoid } from 'nanoid';
import { supabase } from './supabaseClient';

const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.85;

async function uploadFile(bucket: string, path: string, localUri: string, contentType: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const { error } = await supabase.storage.from(bucket).upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * "Publishing" a post now means: resize/compress locally (same as before —
 * no point uploading a 12MP photo), then upload the result to Supabase
 * Storage's public `posts` bucket and return its public URL. Every screen
 * still just gets a `path` string back — it doesn't care whether that's a
 * local file:// path or an https:// URL.
 */
export async function persistImage(sourceUri: string): Promise<{ path: string; width: number; height: number }> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  const url = await uploadFile('posts', `${nanoid()}.jpg`, manipulated.uri, 'image/jpeg');
  return { path: url, width: manipulated.width, height: manipulated.height };
}

export async function persistThumbnail(sourceUri: string, size = 300): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: size } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return uploadFile('posts', `${nanoid()}_thumb.jpg`, manipulated.uri, 'image/jpeg');
}

/** Uploads a recorded/picked video as-is (no re-encoding) plus a generated thumbnail. */
export async function persistVideo(sourceUri: string): Promise<{ path: string; thumbPath: string }> {
  const path = await uploadFile('posts', `${nanoid()}.mp4`, sourceUri, 'video/mp4');
  const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(sourceUri, { time: 300 });
  const thumbPath = await persistThumbnail(thumbUri);
  return { path, thumbPath };
}

export async function persistAvatar(sourceUri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 300 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return uploadFile('avatars', `${nanoid()}.jpg`, manipulated.uri, 'image/jpeg');
}

export async function persistStoryImage(sourceUri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  return uploadFile('stories', `${nanoid()}.jpg`, manipulated.uri, 'image/jpeg');
}

export async function persistStoryVideo(sourceUri: string): Promise<string> {
  return uploadFile('stories', `${nanoid()}.mp4`, sourceUri, 'video/mp4');
}

/** Local-only cache housekeeping (Settings > Storage). Remote media lives in Supabase Storage, not counted here. */
export async function getMediaStorageUsage(): Promise<number> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) return 0;
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    let total = 0;
    for (const f of files) {
      const info = await FileSystem.getInfoAsync(dir + f, { size: true });
      total += (info as any).size ?? 0;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function clearAllMedia() {
  const dir = FileSystem.cacheDirectory;
  if (!dir) return;
  await FileSystem.deleteAsync(dir, { idempotent: true });
}
