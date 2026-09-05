import AsyncStorage from '@react-native-async-storage/async-storage';

// Purely local UI preferences (onboarding-seen flag, theme choice, etc.) —
// these were never account data, so they stay on-device even now that
// everything else lives in Supabase.
const PREFIX = 'swiftgram_meta_';

export async function getMeta(key: string): Promise<string | null> {
  return AsyncStorage.getItem(PREFIX + key);
}

export async function setMeta(key: string, value: string) {
  await AsyncStorage.setItem(PREFIX + key, value);
}

export async function deleteMeta(key: string) {
  await AsyncStorage.removeItem(PREFIX + key);
}
