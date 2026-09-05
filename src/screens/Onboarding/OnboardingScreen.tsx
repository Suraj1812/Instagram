import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Image } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useTheme } from '../../theme/useTheme';

const SLIDES = [
  { title: 'Welcome to Instagram', body: 'Share moments with a feed that opens instantly and never waits on a spinner.' },
  { title: 'Everything stays on your device', body: 'No servers, no accounts in the cloud. Your posts, photos, and messages live only on this phone.' },
  { title: 'Built for speed', body: 'Local storage means your feed, stories, and reels load instantly — online or off.' },
];

export function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const completeOnboarding = useOnboardingStore((s) => s.complete);
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  // Marks onboarding complete in the reactive store; RootNavigator swaps to
  // the Auth stack automatically once `completed` flips to true — no manual
  // navigation call needed (and none would work, since Auth isn't a sibling
  // route in this navigator).
  const finish = async () => {
    await completeOnboarding();
  };

  const next = () => {
    if (page < SLIDES.length - 1) pagerRef.current?.setPage(page + 1);
    else finish();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Pressable style={styles.skip} onPress={finish}>
        <Text style={{ color: colors.textMuted }}>Skip</Text>
      </Pressable>

      <PagerView ref={pagerRef} style={{ flex: 1 }} initialPage={0} onPageSelected={(e) => setPage(e.nativeEvent.position)}>
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Image source={require('../../../assets/logo.png')} style={styles.onboardingLogo} resizeMode="contain" />
            <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{slide.body}</Text>
          </View>
        ))}
      </PagerView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === page ? colors.accent : colors.border }]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={page === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { alignSelf: 'flex-end', padding: 16 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  onboardingLogo: { width: 112, height: 112, marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
});
