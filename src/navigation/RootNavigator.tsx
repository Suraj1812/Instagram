import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { useThemeStore, useTheme } from '../theme/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { pruneExpiredStories } from '../db/repositories/storyRepository';
import { LoadingState } from '../components/LoadingState';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { session, isBootstrapping, bootstrap } = useAuthStore();
  const { completed: onboarded, hydrate: hydrateOnboarding } = useOnboardingStore();
  const { mode, hydrate: hydrateTheme } = useThemeStore();
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      await hydrateTheme();
      await bootstrap();
      await hydrateOnboarding();
      pruneExpiredStories(); // housekeeping on every cold start, don't block UI on it
    })();
  }, [bootstrap, hydrateTheme, hydrateOnboarding]);

  if (isBootstrapping || onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState label="Starting Instagram…" />
      </View>
    );
  }

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: { ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors), background: colors.bg, card: colors.bg, text: colors.text, border: colors.border },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
