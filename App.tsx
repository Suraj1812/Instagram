import 'react-native-get-random-values'; // must be the very first import: nanoid needs crypto.getRandomValues, which RN doesn't provide natively
import { Buffer } from 'buffer';
// @ts-ignore — RN has no global Buffer; the WebRTC signaling codec (base64 encode/decode) needs it.
if (typeof global.Buffer === 'undefined') global.Buffer = Buffer;
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from './src/db/database';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Opens the SQLite connection and runs migrations before anything else
    // mounts. There is no server handshake to wait on — this is the only
    // async gate the app has at startup.
    getDb().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
