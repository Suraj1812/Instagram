import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LocalImage } from './LocalImage';
import { useTheme } from '../theme/useTheme';

interface Props {
  path?: string;
  size: number;
  ringState?: 'none' | 'unseen' | 'seen';
}

export function Avatar({ path, size, ringState = 'none' }: Props) {
  const { colors } = useTheme();
  const ringWidth = ringState === 'none' ? 0 : 2.5;
  const inner = size - ringWidth * 2 - (ringState !== 'none' ? 2 : 0);

  const content = (
    <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      {path ? <LocalImage path={path} style={{ width: inner, height: inner }} /> : null}
    </View>
  );

  if (ringState === 'unseen') {
    return (
      <LinearGradient
        colors={['#f9ce34', '#ee2a7b', '#6228d7']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View style={[styles.ringInner, { backgroundColor: colors.bg }]}>{content}</View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: ringState === 'seen' ? 2 : 0, borderColor: colors.border }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringInner: { padding: 2, borderRadius: 999 },
});
