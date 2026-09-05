import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getProfileById, updateProfile } from '../../db/repositories/userRepository';
import { persistAvatar } from '../../services/mediaStorage';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { useTheme } from '../../theme/useTheme';
import { LoadingState } from '../../components/LoadingState';
import type { UserProfile } from '../../types';

export function EditProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session)!;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfileById(session.userId, session.userId).then((p) => {
      if (!p) return;
      setProfile(p);
      setDisplayName(p.displayName ?? '');
      setBio(p.bio ?? '');
      setIsPrivate(p.isPrivate);
      setAvatarPath(p.avatarPath);
    }).catch((error: any) => {
      Alert.alert('Could not load profile', error?.message ?? 'Please try again.');
    }).finally(() => setLoading(false));
  }, [session.userId]);

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo permission needed', 'Allow photo access to choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, aspect: [1, 1] });
      if (result.canceled) return;
      const path = await persistAvatar(result.assets[0].uri);
      setAvatarPath(path);
    } catch (error: any) {
      Alert.alert('Could not update photo', error?.message ?? 'Please try again.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(session.userId, { displayName: displayName.trim(), bio: bio.trim(), avatarPath, isPrivate });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Could not save profile', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <View style={{ flex: 1, backgroundColor: colors.bg }}><LoadingState label={loading ? 'Loading your profile…' : 'Profile could not be loaded. Go back and try again.'} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.text }}>Cancel</Text></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Edit profile</Text>
        <Pressable onPress={save} disabled={saving}><Text style={{ color: colors.accent, fontWeight: '700' }}>Save</Text></Pressable>
      </View>

      <Pressable style={styles.avatarRow} onPress={pickAvatar}>
        <Avatar path={avatarPath} size={80} />
        <Text style={{ color: colors.accent, marginTop: 8, fontWeight: '600' }}>Change photo</Text>
      </Pressable>

      <Text style={[styles.label, { color: colors.textMuted }]}>Display name</Text>
      <Input value={displayName} onChangeText={setDisplayName} style={styles.field} />
      <Text style={[styles.label, { color: colors.textMuted }]}>Bio</Text>
      <Input value={bio} onChangeText={setBio} multiline style={[styles.field, { minHeight: 70, textAlignVertical: 'top' }]} />

      <View style={styles.privacyRow}>
        <View>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Private account</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Only approved followers see your posts</Text>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  title: { fontWeight: '700', fontSize: 16 },
  avatarRow: { alignItems: 'center', paddingVertical: 16 },
  label: { fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  field: { marginHorizontal: 16 },
  privacyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginTop: 12 },
});
