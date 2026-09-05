import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props { label?: string; compact?: boolean; dark?: boolean; }

export function LoadingState({ label = 'Loading…', compact = false, dark = false }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ActivityIndicator size={compact ? 'small' : 'large'} color={dark ? '#fff' : colors.accent} />
      <Text style={[styles.label, { color: dark ? '#ddd' : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  compact: { flex: 0, minHeight: 72, paddingVertical: 18 },
  label: { fontSize: 13 },
});
