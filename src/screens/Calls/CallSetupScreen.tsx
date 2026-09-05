import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LocalWebRTCCall, CallKind } from '../../services/webrtcCall';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ChevronLeftIcon, QrCodeIcon, MicIcon, VideoCameraIcon } from '../../components/icons';
import { CallCodeQr, CallCodeScanner } from '../../components/CallCodeQr';
import { useTheme } from '../../theme/useTheme';

type Mode = 'choose' | 'calling-share-offer' | 'calling-enter-answer' | 'receiving-enter-offer' | 'receiving-share-answer';
type ShareView = 'code' | 'qr';

export function CallSetupScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { title }: { title: string } = route.params ?? { title: 'Call' };
  const [mode, setMode] = useState<Mode>('choose');
  const [kind, setKind] = useState<CallKind>('video');
  const [myCode, setMyCode] = useState('');
  const [pastedCode, setPastedCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [shareView, setShareView] = useState<ShareView>('code');
  const [scanning, setScanning] = useState(false);
  const callRef = useRef<LocalWebRTCCall | null>(null);

  const startOutgoingCall = async (callKind: CallKind) => {
    setKind(callKind);
    setBusy(true);
    try {
      const call = new LocalWebRTCCall();
      callRef.current = call;
      await call.startLocalMedia(callKind);
      const code = await call.createOfferCode();
      setMyCode(code);
      setMode('calling-share-offer');
    } catch (e: any) {
      Alert.alert('Could not start call', e.message ?? 'Camera/microphone permission may be needed.');
    } finally {
      setBusy(false);
    }
  };

  const submitAnswerCode = async () => {
    if (!callRef.current || !pastedCode.trim()) return;
    setBusy(true);
    try {
      await callRef.current.acceptAnswerCode(pastedCode.trim());
      navigation.replace('InCall', { call: callRef.current, kind, title });
    } catch (e) {
      Alert.alert('Connection failed', 'That code looks invalid or expired. Ask them to send a fresh one.');
    } finally {
      setBusy(false);
    }
  };

  const startReceivingFlow = () => {
    setMode('receiving-enter-offer');
  };

  const submitOfferCode = async (callKind: CallKind) => {
    if (!pastedCode.trim()) return;
    setBusy(true);
    try {
      const call = new LocalWebRTCCall();
      callRef.current = call;
      await call.startLocalMedia(callKind);
      const answerCode = await call.createAnswerCode(pastedCode.trim());
      setMyCode(answerCode);
      setMode('receiving-share-answer');
      // Connection completes as soon as the caller enters this answer code
      // on their end — poll connection state so we can auto-enter the call.
      call.onConnectionStateChange = (state) => {
        if (state === 'connected') navigation.replace('InCall', { call, kind: callKind, title });
      };
    } catch (e: any) {
      Alert.alert('Could not join call', e.message ?? 'That code may be invalid, or camera/mic permission is needed.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(myCode);
    Alert.alert('Copied', 'Send this code to the other person however you like — text, chat, read it aloud.');
  };

  const shareCode = async () => {
    try { await Share.share({ message: myCode }); } catch {}
  };

  if (scanning) {
    return (
      <CallCodeScanner
        onScanned={(data) => {
          setScanning(false);
          setPastedCode(data);
        }}
        onCancel={() => setScanning(false)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeftIcon size={24} color={colors.text} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'choose' && (
          <>
            <Text style={[styles.explainer, { color: colors.textMuted }]}>
              Calls connect device-to-device with WebRTC. Since there's no server, starting a call generates
              a one-time connection code you send the other person any way you like — the call itself never touches a server.
            </Text>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Start a call</Text>
            <View style={styles.row}>
              <Button label="Voice" icon={<MicIcon size={18} color={colors.text} />} variant="secondary" onPress={() => startOutgoingCall('audio')} loading={busy} style={{ flex: 1 }} />
              <Button label="Video" icon={<VideoCameraIcon size={18} color="#fff" />} variant="primary" onPress={() => startOutgoingCall('video')} loading={busy} style={{ flex: 1 }} />
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>Join a call</Text>
            <Text style={[styles.explainer, { color: colors.textMuted }]}>Received a code from someone? Paste it here.</Text>
            <Button label="Enter connection code" variant="outline" onPress={startReceivingFlow} />
          </>
        )}

        {mode === 'calling-share-offer' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Step 1: Send this code</Text>
            <Text style={[styles.explainer, { color: colors.textMuted }]}>Share it with {title} through chat, text, or a QR scan if you're together.</Text>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setShareView('code')} style={[styles.toggleBtn, shareView === 'code' && { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Text code</Text>
              </Pressable>
              <Pressable onPress={() => setShareView('qr')} style={[styles.toggleBtn, shareView === 'qr' && { backgroundColor: colors.surfaceAlt }]}>
                <QrCodeIcon size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 6 }}>QR code</Text>
              </Pressable>
            </View>
            {shareView === 'qr' ? (
              <CallCodeQr code={myCode} />
            ) : (
              <View style={[styles.codeBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ color: colors.text, fontSize: 12 }} numberOfLines={4}>{myCode.slice(0, 200)}…</Text>
              </View>
            )}
            <View style={styles.row}>
              <Button label="Copy code" variant="secondary" onPress={copyCode} style={{ flex: 1 }} />
              <Button label="Share" variant="secondary" onPress={shareCode} style={{ flex: 1 }} />
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>Step 2: Paste their reply code</Text>
            <View style={styles.row}>
              <Input placeholder="Paste the answer code here…" multiline value={pastedCode} onChangeText={setPastedCode} style={[styles.codeInput, { flex: 1 }]} />
            </View>
            <Pressable onPress={() => setScanning(true)} style={styles.scanLink}>
              <QrCodeIcon size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '600', marginLeft: 6 }}>Scan their QR code instead</Text>
            </Pressable>
            <Button label="Connect" onPress={submitAnswerCode} loading={busy} disabled={!pastedCode.trim()} />
          </>
        )}

        {mode === 'receiving-enter-offer' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Paste the code they sent you</Text>
            <Input placeholder="Paste the connection code here…" multiline value={pastedCode} onChangeText={setPastedCode} style={styles.codeInput} />
            <Pressable onPress={() => setScanning(true)} style={styles.scanLink}>
              <QrCodeIcon size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '600', marginLeft: 6 }}>Scan their QR code instead</Text>
            </Pressable>
            <View style={styles.row}>
              <Button label="Answer with voice" icon={<MicIcon size={18} color={colors.text} />} variant="secondary" onPress={() => submitOfferCode('audio')} loading={busy} style={{ flex: 1 }} disabled={!pastedCode.trim()} />
              <Button label="Answer with video" icon={<VideoCameraIcon size={18} color="#fff" />} variant="primary" onPress={() => submitOfferCode('video')} loading={busy} style={{ flex: 1 }} disabled={!pastedCode.trim()} />
            </View>
          </>
        )}

        {mode === 'receiving-share-answer' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Send this reply code back</Text>
            <Text style={[styles.explainer, { color: colors.textMuted }]}>Once they enter it on their end, the call connects automatically.</Text>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setShareView('code')} style={[styles.toggleBtn, shareView === 'code' && { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Text code</Text>
              </Pressable>
              <Pressable onPress={() => setShareView('qr')} style={[styles.toggleBtn, shareView === 'qr' && { backgroundColor: colors.surfaceAlt }]}>
                <QrCodeIcon size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 6 }}>QR code</Text>
              </Pressable>
            </View>
            {shareView === 'qr' ? (
              <CallCodeQr code={myCode} />
            ) : (
              <View style={[styles.codeBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ color: colors.text, fontSize: 12 }} numberOfLines={4}>{myCode.slice(0, 200)}…</Text>
              </View>
            )}
            <View style={styles.row}>
              <Button label="Copy code" variant="secondary" onPress={copyCode} style={{ flex: 1 }} />
              <Button label="Share" variant="secondary" onPress={shareCode} style={{ flex: 1 }} />
            </View>
            <Text style={[styles.explainer, { color: colors.textMuted, marginTop: 16 }]}>Waiting for connection…</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  title: { fontWeight: '700', fontSize: 16 },
  content: { padding: 16, paddingBottom: 40 },
  explainer: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  sectionLabel: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  codeBox: { padding: 12, borderRadius: 10, marginBottom: 12, maxHeight: 100 },
  codeInput: { minHeight: 90, textAlignVertical: 'top', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  scanLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginBottom: 8 },
});
