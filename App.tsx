import 'react-native-get-random-values'; // must be the very first import: nanoid needs crypto.getRandomValues, which RN doesn't provide natively
import { Buffer } from 'buffer';
// @ts-ignore — RN has no global Buffer; the WebRTC signaling codec (base64 encode/decode) needs it.
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useTheme } from './src/theme/useTheme';

export default function App() {
  const { mode } = useTheme();
  // No local-DB handshake to wait on anymore — RootNavigator's own
  // bootstrap (restoring the Supabase session) is the only async gate now,
  // and it renders its own loading state.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
