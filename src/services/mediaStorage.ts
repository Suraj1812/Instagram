import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { nanoid } from 'nanoid';

const MEDIA_DIR = `${FileSystem.documentDirectory}media/`;
const MAX_DIMENSION = 1440;
const JPEG_QUALITY = 0.85;

export async function ensureMediaDir() {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
}

/**
 * There is no upload step in this app — "publishing" a post means resizing
 * the image and copying the result into permanent on-device storage
 * (documentDirectory, which survives app restarts, unlike cacheDirectory).
 * This is the entire persistence story for media.
 */
export async function persistImage(sourceUri: string): Promise<{ path: string; width: number; height: number }> {
  await ensureMediaDir();
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  const destPath = `${MEDIA_DIR}${nanoid()}.jpg`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: destPath });
  return { path: destPath, width: manipulated.width, height: manipulated.height };
}

export async function persistThumbnail(sourceUri: string, size = 300): Promise<string> {
  await ensureMediaDir();
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: size } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  const destPath = `${MEDIA_DIR}${nanoid()}_thumb.jpg`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: destPath });
  return destPath;
}

/** Copies a recorded/picked video into permanent storage, no re-encoding. */
export async function persistVideo(sourceUri: string): Promise<{ path: string; thumbPath: string }> {
  await ensureMediaDir();
  const destPath = `${MEDIA_DIR}${nanoid()}.mp4`;
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(sourceUri, { time: 300 });
  const thumbPath = await persistThumbnail(thumbUri);
  return { path: destPath, thumbPath };
}

/** Used once at first launch to copy bundled seed assets into app storage. */
export async function persistBundledAsset(moduleRef: number): Promise<string> {
  await ensureMediaDir();
  const { Asset } = await import('expo-asset');
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync(); // "download" here just resolves the local bundled file
  const destPath = `${MEDIA_DIR}${nanoid()}.jpg`;
  await FileSystem.copyAsync({ from: asset.localUri ?? asset.uri, to: destPath });
  return destPath;
}

export async function persistBundledVideo(moduleRef: number): Promise<string> {
  await ensureMediaDir();
  const { Asset } = await import('expo-asset');
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const destPath = `${MEDIA_DIR}${nanoid()}.mp4`;
  await FileSystem.copyAsync({ from: asset.localUri ?? asset.uri, to: destPath });
  return destPath;
}

export async function deleteMedia(path: string) {
  await FileSystem.deleteAsync(path, { idempotent: true });
}

/** Total on-device space used by app media — shown in Settings > Storage. */
export async function getMediaStorageUsage(): Promise<number> {
  await ensureMediaDir();
  const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);
  let total = 0;
  for (const f of files) {
    const info = await FileSystem.getInfoAsync(MEDIA_DIR + f, { size: true });
    total += (info as any).size ?? 0;
  }
  return total;
}

export async function clearAllMedia() {
  await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
  await ensureMediaDir();
}
