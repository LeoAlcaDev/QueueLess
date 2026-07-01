import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { z } from 'zod';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Field, Icon, Screen, StateBanner, Text } from '@/components/ui';
import { BrandMark } from '@/features/common/components';
import { tokenStorage, useAuth } from '@/auth';
import { useBiometricAuth, useToast } from '@/hooks';
import { ApiError } from '@/api';
import { emailSchema, requiredText } from '@/lib';

const loginSchema = z.object({
  email: emailSchema,
  password: requiredText('Ingresa tu contraseña'),
});

interface FieldErrors {
  email?: string;
  password?: string;
}

// Inicio de sesión con correo y contraseña. Valida con zod antes de pegarle al
// backend; un 401 se muestra como banner ("credenciales inválidas") y los errores
// de campo del backend caen bajo su Field. Si el equipo tiene biometría, ofrece el
// atajo de Face ID o huella sobre la sesión guardada.
export function LoginScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const { login, refresh } = useAuth();
  const biometric = useBiometricAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [credencialesInvalidas, setCredencialesInvalidas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puedeDesbloquear, setPuedeDesbloquear] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      // el botón solo tiene sentido si el usuario activó la preferencia y
      // sigue habiendo un refresh token guardado (logout lo conserva cifrado
      // solo cuando la biometría está activa; ver tokenStorage.clearForLogout)
      const habilitada = await tokenStorage.getBiometricEnabled();
      const refreshToken = habilitada ? await tokenStorage.getRefreshToken() : null;
      if (active) setPuedeDesbloquear(habilitada && !!refreshToken);
    })();
    return () => {
      active = false;
    };
  }, []);

  function limpiarEstados() {
    setErrors({});
    setCredencialesInvalidas(false);
  }

  async function onSubmit() {
    limpiarEstados();
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const nuevos: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0];
        if (campo === 'email' || campo === 'password') nuevos[campo] = issue.message;
      }
      setErrors(nuevos);
      return;
    }

    setLoading(true);
    try {
      await login(parsed.data.email, password);
      // al autenticar, el RootNavigator desmonta este stack y muestra el panel del rol
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'unauthorized') {
        setCredencialesInvalidas(true);
      } else if (err instanceof ApiError && err.fieldErrors) {
        const nuevos: FieldErrors = {};
        for (const fe of err.fieldErrors) {
          if (fe.field === 'email' || fe.field === 'password') nuevos[fe.field] = fe.message;
        }
        setErrors(nuevos);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Algo salió mal, intenta de nuevo.');
      }
      setLoading(false);
    }
  }

  async function onBiometric() {
    const ok = await biometric.authenticate('Ingresa con tu biometría');
    if (!ok) return;
    try {
      await refresh();
    } catch {
      toast.error('No pudimos abrir tu sesión guardada. Ingresa con tu contraseña.');
    }
  }

  return (
    <Screen scroll padded>
      <View style={s.root}>
        <View style={s.header}>
          <BrandMark size={56} />
          <View style={s.headerTexts}>
            <Text variant="h2" align="center">
              Inicia sesión
            </Text>
            <Text variant="small" color="textMuted" align="center">
              Tu almuerzo, sin cola, sin estrés.
            </Text>
          </View>
        </View>

        {credencialesInvalidas ? (
          <StateBanner
            tone="error"
            title="No pudimos iniciar sesión"
            message="Credenciales inválidas. Revisa tu correo y contraseña."
          />
        ) : null}

        <View style={s.form}>
          <Field
            label="Correo UTEC"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              limpiarEstados();
            }}
            placeholder="usuario@utec.edu.pe"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
            error={errors.email}
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              limpiarEstados();
            }}
            placeholder="Tu contraseña"
            secureTextEntry
            leftIcon="lock"
            error={errors.password}
          />
        </View>

        <Button
          title={loading ? 'Ingresando…' : 'Iniciar sesión'}
          onPress={onSubmit}
          loading={loading}
          fullWidth
        />

        {biometric.available && puedeDesbloquear ? (
          <Pressable onPress={onBiometric} style={({ pressed }) => [s.biometric, pressed && s.pressed]}>
            <Icon name="scan" size={18} color={t.colors.textSecondary} />
            <Text variant="label" color="textSecondary">
              Ingresar con biometría
            </Text>
          </Pressable>
        ) : null}

        <View style={s.footer}>
          <Text variant="small" color="textSecondary">
            ¿Aún no tienes cuenta?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Registro')} hitSlop={6}>
            <Text variant="small" color="textBrand">
              Crear cuenta
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'center', gap: t.spacing[4] },
    header: { alignItems: 'center', gap: t.spacing[3] },
    headerTexts: { gap: t.spacing[1] },
    form: { gap: t.spacing[3] },
    biometric: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[2],
      minHeight: 46,
      borderRadius: t.radii.button,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurface,
    },
    pressed: { opacity: 0.85 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  });
}
