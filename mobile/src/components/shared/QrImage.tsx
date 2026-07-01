import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { apiBaseUrl, authBridge, endpoints } from '@/api';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Spinner, StateBanner } from '@/components/ui';

export interface QrImageProps {
  orderId: number;
  size?: number;
}

export function QrImage({ orderId, size = 220 }: QrImageProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    authBridge.getAccessToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const uri = `${apiBaseUrl}${endpoints.cliente.pedidoQr(orderId)}`;

  return (
    <View style={[s.card, { width: size + t.spacing[6] }]}>
      {failed ? (
        <StateBanner tone="error" message="No pudimos cargar el QR" />
      ) : token ? (
        <Image
          source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
          style={{ width: size, height: size, borderRadius: t.radii.input }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      )}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    // el QR va sobre blanco fijo para que escanee bien en cualquier modo
    card: {
      backgroundColor: '#fff',
      borderRadius: t.radii.card,
      padding: t.spacing[4],
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      ...t.shadow.sm,
    },
  });
}
