import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, compact }: Props) {
  const { colors, radii } = useTheme();

  const bg = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    outline: 'transparent',
    danger: colors.danger,
  }[variant];
  const textColor = variant === 'secondary' || variant === 'outline' ? colors.text : '#fff';
  const borderColor = variant === 'outline' ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor, borderWidth: variant === 'outline' ? 1 : 0, borderRadius: radii.md, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        compact && styles.compact,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  compact: { paddingVertical: 7, paddingHorizontal: 12 },
  label: { fontWeight: '700', fontSize: 14 },
});
