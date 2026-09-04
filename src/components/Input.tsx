import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function Input(props: TextInputProps) {
  const { colors, radii } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.base, { backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radii.md }, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: { padding: 14, fontSize: 15 },
});
