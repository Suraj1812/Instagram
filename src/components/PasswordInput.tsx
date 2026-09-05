import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface Props extends TextInputProps {
  wrapperStyle?: StyleProp<ViewStyle>;
}

export function PasswordInput({ wrapperStyle, placeholderTextColor, ...props }: Props) {
  const { colors, radii } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }, wrapperStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        placeholderTextColor={placeholderTextColor ?? colors.textMuted}
        style={[styles.input, { color: colors.text }, props.style]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={10}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 54, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minHeight: 52, paddingHorizontal: 16, fontSize: 16 },
  toggle: { minHeight: 52, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
});
