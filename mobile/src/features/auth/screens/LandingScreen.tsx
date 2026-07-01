import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, type IconName, Screen, Text } from '@/components/ui';
import { BrandWordmark } from '@/features/common/components';

interface Propuesta {
  icon: IconName;
  titulo: string;
  detalle: string;
}

const PROPUESTAS: Propuesta[] = [
  { icon: 'shoppingBag', titulo: 'Pide y paga', detalle: 'Desde tu celu, entre clases.' },
  { icon: 'qrCode', titulo: 'Recoge sin colas', detalle: 'Muestra tu QR y listo.' },
  { icon: 'users', titulo: 'Entrega comunitaria', detalle: 'Un compañero te lo lleva.' },
];

// Pantalla de bienvenida: hero naranja con la marca, la promesa y las acciones de
// entrar o crear cuenta. Al ir sobre el naranja, las acciones invierten colores
// (botón blanco) en vez del relleno brandStrong habitual.
export function LandingScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();

  return (
    <Screen background="brandStrong" scroll={false}>
      <View style={s.root}>
        <BrandWordmark size={40} color={t.colors.onBrand} textColor={t.colors.onBrand} />

        <View style={s.middle}>
          <View style={s.headline}>
            <Text variant="h1" style={s.title}>
              Pide, paga y recoge sin colas
            </Text>
            <Text variant="body" style={s.subtitle}>
              Tu almuerzo del campus, sin la fila.
            </Text>
          </View>

          <View style={s.propuestas}>
            {PROPUESTAS.map((propuesta) => (
              <View key={propuesta.titulo} style={s.propuesta}>
                <View style={s.propuestaIcon}>
                  <Icon name={propuesta.icon} size={20} color={t.colors.onBrand} />
                </View>
                <View style={s.propuestaTexto}>
                  <Text variant="label" style={s.propuestaTitulo}>
                    {propuesta.titulo}
                  </Text>
                  <Text variant="small" style={s.propuestaDetalle}>
                    {propuesta.detalle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.acciones}>
          <Pressable
            onPress={() => navigation.navigate('Registro')}
            style={({ pressed }) => [s.cta, s.ctaPrimary, pressed && s.pressed]}
          >
            <Text variant="label" style={s.ctaPrimaryText}>
              Crear cuenta
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [s.cta, s.ctaSecondary, pressed && s.pressed]}
          >
            <Text variant="label" style={s.ctaSecondaryText}>
              Ya tengo cuenta
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'space-between', gap: t.spacing[6] },
    middle: { flex: 1, justifyContent: 'center', gap: t.spacing[8] },
    headline: { gap: t.spacing[3] },
    title: { color: t.colors.onBrand },
    subtitle: { color: t.colors.onBrand },
    propuestas: { gap: t.spacing[3] },
    propuesta: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    propuestaIcon: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    propuestaTexto: { flex: 1 },
    propuestaTitulo: { color: t.colors.onBrand },
    propuestaDetalle: { color: t.colors.onBrand },
    acciones: { gap: t.spacing[2] },
    cta: {
      minHeight: 50,
      borderRadius: t.radii.button,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.spacing[4],
    },
    ctaPrimary: { backgroundColor: t.colors.onBrand },
    ctaPrimaryText: { color: t.colors.brandStrong, fontFamily: t.fontFamily.bold },
    ctaSecondary: { borderWidth: 1.5, borderColor: t.colors.onBrand },
    ctaSecondaryText: { color: t.colors.onBrand, fontFamily: t.fontFamily.bold },
    pressed: { opacity: 0.85 },
  });
}
