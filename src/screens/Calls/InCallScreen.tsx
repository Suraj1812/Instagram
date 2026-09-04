import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import type { LocalWebRTCCall, CallKind } from '../../services/webrtcCall';
import { MicIcon, VideoCameraIcon, FlipCameraIcon, EndCallIcon } from '../../components/icons';

export function InCallScreen({ route, navigation }: any) {
  const { call, kind, title }: { call: LocalWebRTCCall; kind: CallKind; title: string } = route.params;
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(call.remoteStream?.toURL() ?? null);
  const [connectionState, setConnectionState] = useState('connecting');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    call.onRemoteStream = (stream) => setRemoteStreamUrl(stream.toURL());
    call.onConnectionStateChange = (state) => setConnectionState(state);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      endCall();
      return true;
    });
    return () => {
      backHandler.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connectionState === 'connected' && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connectionState]);

  const endCall = () => {
    call.hangUp();
    navigation.popToTop();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    call.toggleMute(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    call.toggleCamera(next);
  };

  const timeLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const localUrl = call.localStream?.toURL();

  return (
    <View style={styles.container}>
      {kind === 'video' && remoteStreamUrl ? (
        <RTCView streamURL={remoteStreamUrl} style={StyleSheet.absoluteFillObject} objectFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.audioBg]}>
          <Text style={styles.audioAvatarLetter}>{title.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topInfo}>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.status}>
            {connectionState === 'connected' ? timeLabel : connectionState === 'connecting' ? 'Connecting…' : connectionState}
          </Text>
        </View>

        {kind === 'video' && localUrl && !cameraOff && (
          <View style={styles.pip}>
            <RTCView streamURL={localUrl} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror />
          </View>
        )}

        <View style={styles.controls}>
          <Pressable style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]} onPress={toggleMute}>
            <MicIcon size={26} color="#fff" />
          </Pressable>
          {kind === 'video' && (
            <>
              <Pressable style={[styles.ctrlBtn, cameraOff && styles.ctrlBtnActive]} onPress={toggleCamera}>
                <VideoCameraIcon size={26} color="#fff" />
              </Pressable>
              <Pressable style={styles.ctrlBtn} onPress={() => call.switchCamera()}>
                <FlipCameraIcon size={26} color="#fff" />
              </Pressable>
            </>
          )}
          <Pressable style={styles.endBtn} onPress={endCall}>
            <EndCallIcon size={28} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topInfo: { alignItems: 'center', paddingTop: 24 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700' },
  status: { color: '#ddd', fontSize: 14, marginTop: 4 },
  audioBg: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  audioAvatarLetter: { color: '#fff', fontSize: 72, fontWeight: '700', opacity: 0.5 },
  pip: { position: 'absolute', top: 90, right: 16, width: 100, height: 150, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 36 },
  ctrlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctrlBtnActive: { backgroundColor: 'rgba(255,255,255,0.85)' },
  endBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ff3040', alignItems: 'center', justifyContent: 'center' },
});
