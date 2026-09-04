import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMediaStorageUsage, clearAllMedia } from '../../services/mediaStorage';
import { resetDatabase } from '../../db/database';
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

  const onResetData = () => {
    Alert.alert(
      'Reset all app data',
      'This permanently deletes every local account, post, story, message, and photo on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything', style: 'destructive',
          onPress: async () => {
            await clearAllMedia();
            await resetDatabase();
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
          <Text style={{ color: colors.text }}>Media on this device</Text>
          <Text style={{ color: colors.textMuted }}>{formatBytes(usage)}</Text>
        </Row>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Every photo and video you post or save is stored directly on this device. There is no cloud backup — if you delete the app, this media is gone.
        </Text>

        <SectionLabel text="Account" />
        <Pressable style={styles.rowPressable} onPress={logout}>
          <Text style={{ color: colors.text }}>Log out</Text>
        </Pressable>
        <Pressable style={styles.rowPressable} onPress={onResetData}>
          <Text style={{ color: colors.danger }}>Reset all app data</Text>
        </Pressable>

        <SectionLabel text="About" />
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          SwiftGram runs entirely on-device. There is no backend, no account server, and no analytics — everything you see was generated or captured locally.
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
