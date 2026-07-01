import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { isApiError } from '@/api';
import { useAuth } from '@/auth';
import { Button, Checkbox, Field, StateBanner } from '@/components/ui';
import { applyFieldErrors, zodResolver } from '@/lib/form';
import { paths } from '@/routes/paths';
import type { Rol } from '@/types';
import { AuthLayout } from '../components/AuthLayout';
import { RoleSelectCards } from '../components/RoleSelectCards';
import { TermsModal } from '../components/TermsModal';
import { registerSchema, type RegisterValues } from '../schemas/authSchemas';

export default function Register() {
  const { register: registrarUsuario } = useAuth();
  const navigate = useNavigate();

  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<RegisterValues>({
    resolver: zodResolver<RegisterValues>(registerSchema),
    defaultValues: { nombreCompleto: '', email: '', password: '', roles: [], terms: false },
  });

  const roles = watch('roles');
  const terms = watch('terms');

  const onValid = async (values: RegisterValues) => {
    setSubmitting(true);
    setBanner(null);
    try {
      await registrarUsuario({
        email: values.email,
        password: values.password,
        nombreCompleto: values.nombreCompleto,
        roles: values.roles as Rol[],
      });
      // la landing redirige al panel del rol activo una vez que la sesión quedó cargada
      navigate(paths.landing, { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        if (error.kind === 'validation') {
          applyFieldErrors(setError, error.fieldErrorMap);
        } else if (error.kind === 'conflict') {
          setError('email', { message: error.message });
        } else {
          setBanner(error.message);
        }
      } else {
        setBanner('No pudimos crear tu cuenta. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout align="top" width="md">
      <div className="space-y-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-ink">Crea tu cuenta</h1>
          <p className="mt-[3px] text-small text-ink-muted">Con tu correo institucional UTEC.</p>
        </div>

        {banner && (
          <StateBanner tone="error" title="No pudimos crear tu cuenta">
            {banner}
          </StateBanner>
        )}

        <form onSubmit={handleSubmit(onValid)} className="space-y-[18px]" noValidate>
          <Field
            label="Nombre completo"
            autoComplete="name"
            placeholder="Tu nombre"
            error={errors.nombreCompleto?.message}
            {...register('nombreCompleto')}
          />
          <Field
            label="Correo UTEC"
            type="email"
            autoComplete="email"
            placeholder="usuario@utec.edu.pe"
            error={errors.email?.message}
            {...register('email')}
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            hint="mín. 8 caracteres"
            placeholder="Crea una contraseña"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex flex-col gap-2.5">
            <span className="ql-label">
              ¿Qué quieres hacer?{' '}
              <span className="font-normal text-ink-muted">(puedes elegir varios)</span>
            </span>
            <RoleSelectCards
              value={roles}
              onChange={(next) => setValue('roles', next, { shouldValidate: isSubmitted })}
              error={errors.roles?.message}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Checkbox
              checked={terms}
              onChange={(checked) => setValue('terms', checked, { shouldValidate: isSubmitted })}
              label="Acepto los Términos y Condiciones"
            />
            {/* el enlace va aparte y no dentro del Checkbox, que ya es un botón en sí mismo */}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="ml-[30px] self-start text-[12.5px] font-semibold text-brand-text hover:underline"
            >
              Leer los Términos y Condiciones
            </button>
            {errors.terms?.message && (
              <p className="ml-[30px] text-small text-error-fg">{errors.terms.message}</p>
            )}
          </div>

          <Button type="submit" full loading={submitting} disabled={!terms}>
            Crear cuenta
          </Button>
        </form>

        <p className="text-center text-[13.5px] text-ink-soft">
          ¿Ya tienes cuenta?{' '}
          <Link to={paths.login} className="font-bold text-brand-text hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>

      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccepted={() => {
          setValue('terms', true, { shouldValidate: isSubmitted });
          setTermsOpen(false);
        }}
      />
    </AuthLayout>
  );
}
