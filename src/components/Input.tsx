import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  const { colors, radii } = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? colors.textMuted}
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          color: colors.text,
          borderColor: colors.border,
          borderRadius: radii.md,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 16, minHeight: 54, fontSize: 16, borderWidth: 1 },
});
