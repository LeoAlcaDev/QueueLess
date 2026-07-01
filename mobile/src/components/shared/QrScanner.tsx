import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { Button, Icon, Text } from '@/components/ui';
import { CodeEntryModal } from './CodeEntryModal';

export interface QrScannerProps {
  onScan: (code: string) => void;
  onCancel: () => void;
  hint?: string;
  allowManual?: boolean;
}

const FRAME = 240;
const LINE_TRAVEL = FRAME - 6;
// superficie fija del visor: stone-900, igual que el handoff
const VIEWFINDER_BG = '#1C1917';

export function QrScanner({ onScan, onCancel, hint, allowManual = true }: QrScannerProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { granted, status, canAskAgain, request } = useCameraPermission();
  const [manualOpen, setManualOpen] = useState(false);
  const handledRef = useRef(false);
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'undetermined') request();
  }, [status, request]);

  // barrido vertical continuo de la línea de escaneo; lineal, sin easing
  useEffect(() => {
    if (!granted) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [granted, scan]);

  // un solo disparo: el lector emite muchos frames del mismo QR
  function handleBarcode(result: { data: string }) {
    if (handledRef.current) return;
    handledRef.current = true;
    onScan(result.data);
  }

  function submitManual(code: string) {
    setManualOpen(false);
    onScan(code);
  }

  if (!granted) {
    return (
      <View style={s.denied}>
        <Icon name="camera" size={40} color={t.colors.textMuted} />
        <Text variant="h3" align="center">
          Cámara no disponible
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          Necesitamos la cámara para escanear el código.
        </Text>
        {canAskAgain ? <Button title="Permitir cámara" onPress={request} fullWidth /> : null}
        {allowManual ? (
          <Button title="Ingresar código a mano" variant="outline" onPress={() => setManualOpen(true)} fullWidth />
        ) : null}
        <Button title="Cancelar" variant="ghost" onPress={onCancel} fullWidth />
        <CodeEntryModal visible={manualOpen} onSubmit={submitManual} onCancel={() => setManualOpen(false)} />
      </View>
    );
  }

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, LINE_TRAVEL] });

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcode}
      />
      <View style={s.overlay} pointerEvents="box-none">
        <View style={s.frame}>
          <View style={[s.corner, s.cornerTL]} />
          <View style={[s.corner, s.cornerTR]} />
          <View style={[s.corner, s.cornerBL]} />
          <View style={[s.corner, s.cornerBR]} />
          <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />
        </View>
        <View style={s.panel}>
          {hint ? (
            <Text variant="body" color="textSecondary" align="center">
              {hint}
            </Text>
          ) : null}
          {allowManual ? (
            <Button title="Ingresar código a mano" variant="secondary" onPress={() => setManualOpen(true)} fullWidth />
          ) : null}
          <Button title="Cancelar" variant="ghost" onPress={onCancel} fullWidth />
        </View>
      </View>
      <CodeEntryModal visible={manualOpen} onSubmit={submitManual} onCancel={() => setManualOpen(false)} />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: VIEWFINDER_BG },
    denied: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[3],
      padding: t.spacing[6],
      backgroundColor: t.colors.bgPage,
    },
    overlay: { flex: 1, justifyContent: 'space-between' },
    frame: {
      alignSelf: 'center',
      marginTop: t.spacing[12],
      width: FRAME,
      height: FRAME,
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderColor: '#fff',
    },
    cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: t.radii.card },
    cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: t.radii.card },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: t.radii.card },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: t.radii.card },
    scanLine: {
      position: 'absolute',
      left: 4,
      right: 4,
      height: 2,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand,
    },
    panel: {
      backgroundColor: t.colors.bgSurface,
      borderTopLeftRadius: t.radii.modal,
      borderTopRightRadius: t.radii.modal,
      padding: t.spacing[4],
      gap: t.spacing[2],
    },
  });
}
