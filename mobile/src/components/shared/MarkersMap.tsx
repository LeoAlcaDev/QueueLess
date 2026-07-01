import { Component, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { toneColors, type StatusTone } from '@/lib';
import { Icon, Text } from '@/components/ui';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  tone?: StatusTone;
}

export interface MarkersMapProps {
  markers: MapMarker[];
  initialRegion?: Region;
  height?: number;
  onMarkerPress?: (id: string) => void;
}

// centro de UTEC como fallback cuando no hay marcadores ni región pedida
const CAMPUS_REGION: Region = {
  latitude: -12.1391,
  longitude: -76.9747,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function regionForMarkers(markers: MapMarker[], initialRegion?: Region): Region {
  if (initialRegion) return initialRegion;
  if (markers.length === 0) return CAMPUS_REGION;
  let sumLat = 0;
  let sumLng = 0;
  for (const marker of markers) {
    sumLat += marker.latitude;
    sumLng += marker.longitude;
  }
  return {
    latitude: sumLat / markers.length,
    longitude: sumLng / markers.length,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };
}

// react-native-maps no viene en Expo Go (su vista nativa no está registrada ahí), así
// que el MapView revienta al renderizar; este límite atrapa esa falla y cae al
// placeholder, de modo que el mapa real solo se ve en un development build sin que la
// demo se caiga.
class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MarkersMap({ markers, initialRegion, height = 220, onMarkerPress }: MarkersMapProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const placeholder = (
    <View style={[s.placeholder, { height }]}>
      <Icon name="mapPin" size={28} color={t.colors.textMuted} />
      <Text variant="small" color="textMuted">
        Mapa no disponible
      </Text>
    </View>
  );

  if (markers.length === 0) return placeholder;

  const region = regionForMarkers(markers, initialRegion);

  return (
    <MapErrorBoundary fallback={placeholder}>
      <View style={[s.wrap, { height }]}>
        <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={region}>
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              title={marker.title}
              pinColor={toneColors(t.colors, marker.tone ?? 'brand').dot}
              onPress={() => onMarkerPress?.(marker.id)}
            />
          ))}
        </MapView>
      </View>
    </MapErrorBoundary>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { borderRadius: t.radii.card, overflow: 'hidden', backgroundColor: t.colors.bgSurface2 },
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[2],
      borderRadius: t.radii.card,
      backgroundColor: t.colors.bgSurface2,
    },
  });
}
