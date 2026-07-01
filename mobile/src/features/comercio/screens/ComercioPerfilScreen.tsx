import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrap } from '@/api';
import type { ActualizarPerfilComercioRequest, ApiResponse, PerfilesResponse } from '@/api/types';
import { useAuth } from '@/auth';
import { Button, Card, Chip, Field, Icon, type IconName, Screen, Skeleton, Text } from '@/components';
import { useToast } from '@/hooks';

export function ComercioPerfilScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user, logout } = useAuth();

  const [ruc, setRuc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tasa, setTasa] = useState<number | null>(null);
  const [rucError, setRucError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const perfiles = unwrap(await api.get<ApiResponse<PerfilesResponse>>(endpoints.perfiles.get()));
      const comercio = perfiles.comercio;
      if (comercio) {
        setRuc(comercio.ruc ?? '');
        setTelefono(comercio.contactoTelefono ?? '');
        setEmail(comercio.contactoEmail ?? '');
        setTasa(comercio.tasaCumplimiento);
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    setGuardando(true);
    setRucError(null);
    const body: ActualizarPerfilComercioRequest = {
      ruc: ruc.trim(),
      contactoTelefono: telefono.trim() ? telefono.trim() : undefined,
      contactoEmail: email.trim() ? email.trim() : undefined,
    };
    try {
      await api.put(endpoints.perfiles.comercio(), body);
      toast.success('Perfil guardado');
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 422 RUC inválido o 400 con error de campo → junto al campo RUC
      if (apiError.kind === 'business') {
        setRucError(apiError.message);
      } else if (apiError.kind === 'validation' && apiError.fieldErrors) {
        const rucFe = apiError.fieldErrors.find((fe) => fe.field === 'ruc');
        setRucError(rucFe ? rucFe.message : apiError.message);
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen scroll>
      <View style={s.head}>
        <View style={s.avatar}>
          <Icon name="store" size={28} color={t.colors.textBrand} />
        </View>
        <View style={s.headTitle}>
          <Text variant="h3" numberOfLines={1}>
            {user?.nombreCompleto ?? 'Mi comercio'}
          </Text>
          <Text variant="small" color="textMuted">
            Comercio · UTEC
          </Text>
        </View>
      </View>

      {cargando ? (
        <Card>
          <Skeleton width="50%" height={14} />
          <View style={{ height: t.spacing[3] }} />
          <Skeleton width="30%" height={22} />
        </Card>
      ) : (
        <Card>
          <View style={s.cumplimiento}>
            <View>
              <Text variant="small" color="textMuted">
                Tasa de cumplimiento
              </Text>
              <Text variant="h2" color="accentText" style={s.tasa}>
                {tasa != null ? `${Math.round(tasa * 100)}%` : '—'}
              </Text>
            </View>
            <Chip label="Solo lectura" tone="success" icon="checkCircle" size="sm" />
          </View>
        </Card>
      )}

      <View style={s.form}>
        <Field
          label="RUC"
          value={ruc}
          onChangeText={(value) => {
            setRuc(value);
            if (rucError) setRucError(null);
          }}
          keyboardType="number-pad"
          helperText="11 dígitos, empieza con 10 o 20"
          error={rucError ?? undefined}
        />
        <Field label="Teléfono de contacto" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
        <Field label="Email de contacto" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button title="Guardar cambios" onPress={guardar} loading={guardando} disabled={cargando} fullWidth />
      </View>

      <Card padding={0}>
        <MenuRow icon="messageCircle" label="Reclamos recibidos" onPress={() => navigation.navigate('ReclamosComercio')} />
        <Divider />
        <MenuRow icon="settings" label="Mi cuenta" onPress={() => navigation.navigate('Settings')} />
        <Divider />
        <MenuRow icon="logOut" label="Cerrar sesión" tone="danger" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress, tone = 'default' }: { icon: IconName; label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const color = tone === 'danger' ? t.colors.errorFg : t.colors.textSecondary;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.menuRow, pressed && { backgroundColor: t.colors.bgSurface2 }]}>
      <Icon name={icon} size={20} color={color} />
      <Text variant="body" style={{ flex: 1, color: tone === 'danger' ? t.colors.errorFg : t.colors.textPrimary }}>
        {label}
      </Text>
      {tone === 'default' ? <Icon name="chevronRight" size={18} color={t.colors.textMuted} /> : null}
    </Pressable>
  );
}

function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.borderDefault, marginLeft: t.spacing[12] }} />;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], marginBottom: t.spacing[4] },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: t.radii.modal,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headTitle: { flex: 1, gap: 2 },
    cumplimiento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tasa: { fontVariant: ['tabular-nums'], marginTop: 2 },
    form: { gap: t.spacing[4], marginTop: t.spacing[4], marginBottom: t.spacing[4] },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[3],
      paddingVertical: t.spacing[4],
      paddingHorizontal: t.spacing[4],
    },
  });
}
