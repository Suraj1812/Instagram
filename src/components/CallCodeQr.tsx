import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/useTheme';

// QR codes degrade fast past a few hundred bytes (denser modules = harder to
// scan reliably on a phone camera, especially screen-to-screen). A WebRTC
// offer/answer with several ICE candidates can run 1-3KB+, which is often
// too much for a scannable code. Rather than silently rendering an
// unreadable QR, we check size and fall back to copy/paste.
const QR_SAFE_LIMIT = 900;

export function CallCodeQr({ code }: { code: string }) {
  const { colors } = useTheme();
  if (code.length > QR_SAFE_LIMIT) {
    return (
      <View style={[styles.tooLong, { backgroundColor: colors.surfaceAlt }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
          This connection code is too long to reliably scan as a QR code ({code.length} characters).
          Use "Copy code" or "Share" below instead.
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.qrWrap, { backgroundColor: '#fff' }]}>
      <QRCode value={code} size={220} backgroundColor="#fff" color="#000" />
    </View>
  );
}

interface ScanProps {
  onScanned: (data: string) => void;
  onCancel: () => void;
}

export function CallCodeScanner({ onScanned, onCancel }: ScanProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permissionBox, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text, marginBottom: 16, textAlign: 'center' }}>
          Camera access is needed to scan a connection code.
        </Text>
        <Pressable onPress={requestPermission} style={[styles.grantBtn, { backgroundColor: colors.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant camera access</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.textMuted }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : (result) => {
          setScanned(true);
          onScanned(result.data);
        }}
      />
      <View style={styles.scanFrame} pointerEvents="none" />
      <Pressable style={styles.cancelScan} onPress={onCancel}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  qrWrap: { padding: 16, borderRadius: 12, alignSelf: 'center', marginBottom: 12 },
  tooLong: { padding: 16, borderRadius: 12, marginBottom: 12 },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  grantBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  scanFrame: { position: 'absolute', top: '30%', left: '15%', right: '15%', height: '30%', borderWidth: 2, borderColor: '#fff', borderRadius: 16 },
  cancelScan: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
});
