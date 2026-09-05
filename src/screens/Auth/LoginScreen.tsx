import React, { useState } from 'react';
import { Text, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';

export function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      Alert.alert('Log in failed', e.message ?? 'Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Image
          source={require('../../../assets/instagram-wordmark.png')}
          style={[styles.wordmarkImage, { tintColor: colors.text }]}
          resizeMode="contain"
          accessibilityLabel="Instagram"
        />
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Log in to your Instagram account</Text>
        <Input placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} style={styles.field} />
        <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} wrapperStyle={styles.field} />
        <Button label="Log in" onPress={onSubmit} loading={loading} disabled={!username || !password} style={{ marginTop: 8 }} />
        <Pressable onPress={() => navigation.navigate('Signup')} style={{ marginTop: 20 }}>
          <Text style={[styles.link, { color: colors.accent }]}>Don't have an account? Create one</Text>
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoImage: { width: 88, height: 88, alignSelf: 'center', marginBottom: 16 },
  wordmarkImage: { width: 230, height: 64, alignSelf: 'center', marginBottom: 8 },
  tagline: { fontSize: 13, textAlign: 'center', marginBottom: 32 },
  field: { marginBottom: 12 },
  link: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
