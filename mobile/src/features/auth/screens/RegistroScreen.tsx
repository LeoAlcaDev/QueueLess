import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { z } from 'zod';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Checkbox, Field, Icon, Screen, Text } from '@/components/ui';
import { ScreenHeader, ROLE_META } from '@/features/common/components';
import { useAuth, ROLES } from '@/auth';
import { useToast } from '@/hooks';
import { ApiError } from '@/api';
import type { Rol } from '@/api/types';
import { emailSchema, passwordSchema, requiredText } from '@/lib';

const registroSchema = z.object({
  nombreCompleto: requiredText('Ingresa tu nombre'),
  email: emailSchema,
  password: passwordSchema,
});

interface FieldErrors {
  nombreCompleto?: string;
  email?: string;
  password?: string;
}

// Alta de cuenta con el correo institucional. Elige uno o más roles (multi-rol
// genuino), valida con zod y, ante un correo ya registrado (409), pinta el error
// bajo el campo de correo. Aceptar los términos habilita el botón.
export function RegistroScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const toast = useToast();

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<Rol[]>(['CLIENTE']);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function toggleRol(rol: Rol) {
    setRoles((actuales) =>
      actuales.includes(rol) ? actuales.filter((r) => r !== rol) : [...actuales, rol],
    );
  }

  async function onSubmit() {
    setErrors({});
    const parsed = registroSchema.safeParse({ nombreCompleto: nombreCompleto.trim(), email: email.trim(), password });
    if (!parsed.success) {
      const nuevos: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0];
        if (campo === 'nombreCompleto' || campo === 'email' || campo === 'password') {
          nuevos[campo] = issue.message;
        }
      }
      setErrors(nuevos);
      return;
    }
    if (roles.length === 0) {
      toast.error('Elige al menos un rol para continuar.');
      return;
    }

    setLoading(true);
    try {
      await register({ nombreCompleto: parsed.data.nombreCompleto, email: parsed.data.email, password, roles });
      // al autenticar, el RootNavigator desmonta el acceso y abre el panel del rol
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'conflict') {
        setErrors({ email: 'Ya existe un usuario con ese correo' });
      } else if (err instanceof ApiError && err.fieldErrors) {
        const nuevos: FieldErrors = {};
        for (const fe of err.fieldErrors) {
          if (fe.field === 'nombreCompleto' || fe.field === 'email' || fe.field === 'password') {
            nuevos[fe.field] = fe.message;
          }
        }
        setErrors(nuevos);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Algo salió mal, intenta de nuevo.');
      }
      setLoading(false);
    }
  }

  return (
    <Screen
      scroll
      padded
      header={<ScreenHeader title="Crear cuenta" onBack={() => navigation.goBack()} />}
    >
      <View style={s.root}>
        <View style={s.intro}>
          <Text variant="h2">Crea tu cuenta</Text>
          <Text variant="small" color="textMuted">
            Con tu correo institucional UTEC.
          </Text>
        </View>

        <View style={s.form}>
          <Field
            label="Nombre completo"
            value={nombreCompleto}
            onChangeText={(v) => {
              setNombreCompleto(v);
              setErrors((e) => ({ ...e, nombreCompleto: undefined }));
            }}
            placeholder="Tu nombre"
            error={errors.nombreCompleto}
          />
          <Field
            label="Correo UTEC"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            placeholder="usuario@utec.edu.pe"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setErrors((e) => ({ ...e, password: undefined }));
            }}
            placeholder="Crea una contraseña"
            secureTextEntry
            helperText="mín. 8 caracteres"
            error={errors.password}
          />
        </View>

        <View style={s.roles}>
          <View style={s.rolesLabel}>
            <Text variant="label" color="textPrimary">
              ¿Qué quieres hacer?
            </Text>
            <Text variant="small" color="textMuted">
              (puedes elegir varios)
            </Text>
          </View>
          {ROLES.map((rol) => {
            const activo = roles.includes(rol);
            const meta = ROLE_META[rol];
            return (
              <Pressable
                key={rol}
                onPress={() => toggleRol(rol)}
                style={[s.roleCard, activo ? s.roleCardOn : s.roleCardOff]}
              >
                <View style={[s.roleIcon, activo ? s.roleIconOn : s.roleIconOff]}>
                  <Icon name={meta.icon} size={20} color={activo ? t.colors.textBrand : t.colors.textMuted} />
                </View>
                <View style={s.roleTexts}>
                  <Text variant="label" color="textPrimary">
                    {meta.titulo}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {meta.subtitulo}
                  </Text>
                </View>
                <View style={[s.check, activo ? s.checkOn : s.checkOff]}>
                  {activo ? <Icon name="check" size={12} color={t.colors.onBrand} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.terminos}>
          <Checkbox
            checked={aceptaTerminos}
            onChange={setAceptaTerminos}
            label="Acepto los Términos y la Política de privacidad"
          />
          <Pressable onPress={() => navigation.navigate('Terminos')} hitSlop={6} style={s.terminosLink}>
            <Text variant="small" color="textBrand">
              Leer los términos
            </Text>
          </Pressable>
        </View>

        <Button title="Crear cuenta" onPress={onSubmit} loading={loading} disabled={!aceptaTerminos} fullWidth />

        <View style={s.footer}>
          <Text variant="small" color="textSecondary">
            ¿Ya tienes cuenta?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={6}>
            <Text variant="small" color="textBrand">
              Inicia sesión
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    intro: { gap: t.spacing[1] },
    form: { gap: t.spacing[3] },
    roles: { gap: t.spacing[2] },
    rolesLabel: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1], marginBottom: t.spacing[1] },
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[3],
      padding: t.spacing[3],
      borderRadius: t.radii.card,
      backgroundColor: t.colors.bgSurface,
    },
    roleCardOn: { borderWidth: 2, borderColor: t.colors.brand },
    roleCardOff: { borderWidth: 1, borderColor: t.colors.borderDefault },
    roleIcon: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleIconOn: { backgroundColor: t.colors.brandSoft },
    roleIconOff: { backgroundColor: t.colors.bgSurface2 },
    roleTexts: { flex: 1 },
    check: {
      width: 22,
      height: 22,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: t.colors.brandStrong },
    checkOff: { borderWidth: 2, borderColor: t.colors.borderStrong },
    terminos: { gap: t.spacing[1] },
    terminosLink: { marginLeft: 34 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  });
}
