import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { persistImage, persistVideo } from '../../services/mediaStorage';
import { createPost, getPostById } from '../../db/repositories/postRepository';
import { useAuthStore } from '../../store/authStore';
import { useFeedStore } from '../../store/feedStore';
import { useTheme } from '../../theme/useTheme';
import { Input } from '../../components/Input';

type PickedMedia = { kind: 'image'; uri: string } | { kind: 'video'; uri: string };

export function CreatePostScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const prependNewPost = useFeedStore((s) => s.prependNewPost);
  const [picked, setPicked] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const pick = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo permission needed', 'Allow photo access to choose media for your post.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPicked(asset.type === 'video' ? { kind: 'video', uri: asset.uri } : { kind: 'image', uri: asset.uri });
    } catch (error: any) {
      Alert.alert('Could not choose media', error?.message ?? 'Please try again.');
    }
  };

  const publish = async () => {
    if (!picked) return;
    setPosting(true);
    try {
      if (picked.kind === 'image') {
        const { path, width, height } = await persistImage(picked.uri);
        const postId = await createPost({
          authorId: session.userId, caption, mediaType: 'image',
          media: [{ path, width, height }], isReel: false,
        });
        const post = await getPostById(session.userId, postId);
        if (post) prependNewPost(post);
      } else {
        const { path, thumbPath } = await persistVideo(picked.uri);
        await createPost({
          authorId: session.userId, caption, mediaType: 'video',
          media: [{ path, thumbPath, width: 480, height: 854 }], isReel: true,
        });
      }
      setPicked(null);
      setCaption('');
      navigation.navigate(picked.kind === 'video' ? 'ReelsTab' : 'HomeTab');
      Alert.alert('Posted', picked.kind === 'video' ? 'Your Reel is live.' : 'Your post is live.');
    } catch (error: any) {
      Alert.alert('Could not publish', error?.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.text }}>Cancel</Text></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>New post</Text>
        <Pressable onPress={publish} disabled={!picked || posting}>
          {posting ? <ActivityIndicator color={colors.text} /> : <Text style={{ color: colors.accent, fontWeight: '700' }}>Share</Text>}
        </Pressable>
      </View>

      <Pressable style={[styles.picker, { backgroundColor: colors.surfaceAlt }]} onPress={pick}>
        {picked ? (
          picked.kind === 'image' ? (
            <Image source={{ uri: picked.uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.videoPreview}>
              <Text style={{ fontSize: 40 }}>🎬</Text>
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Video selected — will post as a Reel</Text>
            </View>
          )
        ) : (
          <Text style={{ color: colors.textMuted }}>Tap to choose a photo or video</Text>
        )}
      </Pressable>

      <Input placeholder="Write a caption…" multiline value={caption} onChangeText={setCaption} style={styles.caption} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  title: { fontWeight: '700', fontSize: 16 },
  picker: { height: 320, marginHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  videoPreview: { alignItems: 'center', padding: 20 },
  caption: { margin: 14, minHeight: 80, textAlignVertical: 'top' },
});
