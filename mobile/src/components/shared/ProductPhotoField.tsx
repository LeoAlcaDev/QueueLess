import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Icon, Spinner, Text } from '@/components/ui';

export interface ProductPhotoFieldProps {
  uri?: string | null;
  onPick: (asset: { uri: string; name: string; mimeType: string }) => void;
  uploading?: boolean;
}

// saca un nombre de archivo de la uri local que devuelve el picker
function fileNameFromUri(uri: string): string {
  const clean = uri.split('?')[0];
  const last = clean.substring(clean.lastIndexOf('/') + 1);
  return last.length > 0 ? last : `foto-${Date.now()}.jpg`;
}

function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

export function ProductPhotoField({ uri, onPick, uploading = false }: ProductPhotoFieldProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const name = asset.fileName ?? fileNameFromUri(asset.uri);
    const mimeType = asset.mimeType ?? mimeFromName(name);
    onPick({ uri: asset.uri, name, mimeType });
  }

  return (
    <View style={s.root}>
      <View style={s.preview}>
        {uri ? (
          <Image source={{ uri }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.placeholder}>
            <Icon name="image" size={28} color={t.colors.textMuted} />
            <Text variant="small" color="textMuted">
              Sin foto
            </Text>
          </View>
        )}
        {uploading ? (
          <View style={s.uploadingOverlay}>
            <Spinner color="onBrand" />
          </View>
        ) : null}
      </View>
      <Button title="Cambiar foto" variant="outline" leftIcon="upload" onPress={pick} disabled={uploading} />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[2], alignSelf: 'flex-start' },
    preview: {
      width: 140,
      height: 140,
      borderRadius: t.radii.card,
      overflow: 'hidden',
      backgroundColor: t.colors.bgSurface2,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
    },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing[1] },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.bgOverlay,
    },
  });
}
