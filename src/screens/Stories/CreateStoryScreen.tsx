import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { persistStoryImage } from '../../services/mediaStorage';
import { createStory } from '../../db/repositories/storyRepository';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../components/Button';

export function CreateStoryScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [uri, setUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 1, aspect: [9, 16] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (result.canceled) return;
    setUri(result.assets[0].uri);
  };

  const publish = async () => {
    if (!uri) return;
    setPosting(true);
    const path = await persistStoryImage(uri);
    await createStory(session.userId, path, 'image');
    setPosting(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.text }}>Cancel</Text></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>New story</Text>
        <Pressable onPress={publish} disabled={!uri || posting}>
          {posting ? <ActivityIndicator color={colors.text} /> : <Text style={{ color: colors.accent, fontWeight: '700' }}>Share</Text>}
        </Pressable>
      </View>

      <View style={[styles.preview, { backgroundColor: colors.surfaceAlt }]}>
        {uri ? <Image source={{ uri }} style={styles.previewImg} resizeMode="cover" /> : (
          <Text style={{ color: colors.textMuted }}>Choose a photo for your story</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button label="Take photo" variant="secondary" onPress={() => pick(true)} style={{ flex: 1 }} />
        <Button label="Choose from library" variant="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  title: { fontWeight: '700', fontSize: 16 },
  preview: { flex: 1, margin: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: 10, padding: 14 },
});
