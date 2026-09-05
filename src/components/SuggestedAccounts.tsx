import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { useTheme } from '../theme/useTheme';
import type { Author } from '../types';

interface Props {
  accounts: Author[];
  onPressProfile: (username: string) => void;
  onFollow: (account: Author) => void;
  loadingUsername?: string | null;
}

/** Reusable follow-first suggestions strip for Home, Explore, and Search. */
export function SuggestedAccounts({ accounts, onPressProfile, onFollow, loadingUsername }: Props) {
  const { colors } = useTheme();
  if (accounts.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {accounts.map((account) => (
        <Pressable key={account.id} style={styles.card} onPress={() => onPressProfile(account.username)}>
          <Avatar path={account.avatarPath} size={58} />
          <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>{account.username}</Text>
          <Text style={[styles.displayName, { color: colors.textMuted }]} numberOfLines={1}>{account.displayName ?? 'Suggested for you'}</Text>
          <Button
            label="Follow"
            compact
            loading={loadingUsername === account.username}
            onPress={() => onFollow(account)}
            style={styles.followButton}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function SuggestedAccountsHeader() {
  const { colors } = useTheme();
  return <Text style={[styles.title, { color: colors.text }]}>Suggested for you</Text>;
}

const styles = StyleSheet.create({
  content: { gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  card: { width: 122, alignItems: 'center', padding: 10, borderRadius: 12 },
  title: { fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  username: { fontSize: 12, fontWeight: '700', marginTop: 6, maxWidth: 112 },
  displayName: { fontSize: 10, marginTop: 2, maxWidth: 112 },
  followButton: { width: 100, marginTop: 8 },
});
