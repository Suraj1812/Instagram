import React, { useState } from 'react';
import { Text, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';

export function SignupScreen({ navigation }: any) {
  const { colors } = useTheme();
  const signup = useAuthStore((s) => s.signup);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signup(username.trim(), password, displayName.trim() || username.trim());
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message ?? 'Please try a different username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.logo, { color: colors.text }]}>Create your account</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>Stored only on this device — no server, ever.</Text>
        <Input placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} style={styles.field} />
        <Input placeholder="Display name (optional)" value={displayName} onChangeText={setDisplayName} style={styles.field} />
        <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.field} />
        <Button label="Create account" onPress={onSubmit} loading={loading} disabled={!username || password.length < 4} style={{ marginTop: 8 }} />
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={[styles.link, { color: colors.accent }]}>Already have an account? Log in</Text>
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 13, textAlign: 'center', marginBottom: 32 },
  field: { marginBottom: 12 },
  link: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
