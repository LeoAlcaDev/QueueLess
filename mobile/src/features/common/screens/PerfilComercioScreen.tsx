import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Chip, Field, Screen, Skeleton, StateBanner, Text } from '@/components/ui';
import { ScreenHeader } from '@/features/common/components';
import { useApi, useToast } from '@/hooks';
import { api, ApiError, endpoints, unwrap } from '@/api';
import type { ActualizarPerfilComercioRequest, ApiResponse, PerfilesResponse } from '@/api/types';

// Perfil del comercio: datos de contacto y el RUC. La tasa de cumplimiento la
// calcula el backend y es de solo lectura. Un RUC inválido (422) se pinta bajo su
// campo.
export function PerfilComercioScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const cargar = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PerfilesResponse>>(endpoints.perfiles.get(), { signal }).then(unwrap),
    [],
  );
  const { data, loading, error, run } = useApi(cargar);
  const comercio = data?.comercio ?? null;

  const [ruc, setRuc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [rucError, setRucError] = useState<string | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  useEffect(() => {
    if (!comercio) return;
    setRuc(comercio.ruc);
    setTelefono(comercio.contactoTelefono ?? '');
    setContactoEmail(comercio.contactoEmail ?? '');
  }, [comercio]);

  async function guardar() {
    setRucError(undefined);
    setGuardando(true);
    try {
      const body: ActualizarPerfilComercioRequest = {
        ruc: ruc.trim(),
        contactoTelefono: telefono.trim() || undefined,
        contactoEmail: contactoEmail.trim() || undefined,
      };
      await api.put(endpoints.perfiles.comercio(), body);
      toast.success('Guardamos los datos del comercio.');
      await run();
    } catch (err) {
      if (err instanceof ApiError && (err.kind === 'business' || err.kind === 'validation')) {
        const fe = err.fieldErrors?.find((e) => e.field === 'ruc');
        setRucError(fe?.message ?? err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'No pudimos guardar los datos.');
      }
    } finally {
      setGuardando(false);
    }
  }

  const cumplimiento = comercio?.tasaCumplimiento;

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Perfil de comercio"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
      footer={comercio ? <Button title="Guardar cambios" onPress={guardar} loading={guardando} fullWidth /> : undefined}
    >
      {loading && !data ? (
        <View style={s.skeletons}>
          <Skeleton width="100%" height={48} radius={t.radii.input} />
          <Skeleton width="100%" height={48} radius={t.radii.input} />
          <Skeleton width="100%" height={48} radius={t.radii.input} />
        </View>
      ) : error && !data ? (
        <StateBanner
          tone="error"
          title="No pudimos cargar tu perfil"
          message={error.message}
          action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
        />
      ) : !comercio ? (
        <StateBanner
          tone="info"
          title="Sin perfil de comercio"
          message="Activa el rol de comercio para gestionar tu local."
        />
      ) : (
        <View style={s.root}>
          {cumplimiento != null ? (
            <View style={s.cumplimiento}>
              <Text variant="label" color="textPrimary">
                Tasa de cumplimiento
              </Text>
              <Chip label={`${Math.round(cumplimiento * 100)}%`} tone="success" icon="checkCircle" />
            </View>
          ) : null}

          <Field
            label="RUC"
            value={ruc}
            onChangeText={(v) => {
              setRuc(v);
              setRucError(undefined);
            }}
            placeholder="20512345678"
            keyboardType="number-pad"
            helperText="11 dígitos, empieza con 10 o 20."
            error={rucError}
          />

          <Field
            label="Teléfono de contacto"
            value={telefono}
            onChangeText={setTelefono}
            placeholder="01 555 1234"
            keyboardType="phone-pad"
            leftIcon="phone"
          />

          <Field
            label="Correo de contacto"
            value={contactoEmail}
            onChangeText={setContactoEmail}
            placeholder="contacto@tulocal.pe"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
          />
        </View>
      )}
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    skeletons: { gap: t.spacing[3] },
    cumplimiento: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing[1],
    },
  });
}
