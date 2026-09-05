import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMediaStorageUsage, clearAllMedia } from '../../services/mediaStorage';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, useTheme } from '../../theme/useTheme';
import { ChevronLeftIcon } from '../../components/icons';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { mode, toggle } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const [usage, setUsage] = useState(0);

  const loadUsage = useCallback(() => { getMediaStorageUsage().then(setUsage); }, []);
  useEffect(() => { loadUsage(); }, [loadUsage]);

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete your account',
      'This permanently deletes your account and everything tied to it — your posts, stories, messages, likes, and follows. Other accounts and their content are unaffected. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_own_account');
            if (error) {
              Alert.alert('Something went wrong', error.message);
              return;
            }
            await clearAllMedia();
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeftIcon size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView>
        <SectionLabel text="Appearance" />
        <Row>
          <Text style={{ color: colors.text }}>Dark mode</Text>
          <Switch value={mode === 'dark'} onValueChange={toggle} />
        </Row>

        <SectionLabel text="Storage" />
        <Row>
          <Text style={{ color: colors.text }}>Local cache on this device</Text>
          <Text style={{ color: colors.textMuted }}>{formatBytes(usage)}</Text>
        </Row>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Your photos and videos are stored in the cloud (Supabase Storage), so they follow your account across devices. This is just the local cache Expo keeps for faster loading.
        </Text>

        <SectionLabel text="Account" />
        <Pressable style={styles.rowPressable} onPress={logout}>
          <Text style={{ color: colors.text }}>Log out</Text>
        </Pressable>
        <Pressable style={styles.rowPressable} onPress={onDeleteAccount}>
          <Text style={{ color: colors.danger }}>Delete my account</Text>
        </Pressable>

        <SectionLabel text="About" />
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Instagram is powered by Supabase — your account, posts, and messages sync across every device you log into.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{text}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700', fontSize: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  rowPressable: { paddingHorizontal: 16, paddingVertical: 12 },
  hint: { paddingHorizontal: 16, paddingTop: 4, fontSize: 12, lineHeight: 17 },
});
