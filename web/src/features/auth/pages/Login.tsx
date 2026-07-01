import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { useAsyncAction } from '@/hooks';
import { Button, Field, StateBanner } from '@/components/ui';
import { paths } from '@/routes/paths';
import { zodResolver } from '@/lib/form';
import { AuthLayout } from '../components/AuthLayout';
import { loginSchema, type LoginValues } from '../schemas/authSchemas';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // a donde volver despues de entrar: la ruta que nos rebotó al login, o el panel del rol
  const from = (location.state as { from?: string } | null)?.from ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver<LoginValues>(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = useAsyncAction(async (values: LoginValues) => {
    await login(values.email, values.password);
    return true;
  });

  const onValid = async (values: LoginValues) => {
    const ok = await submit.run(values);
    if (ok) {
      // sin un "from", vamos a la raíz: la landing redirige al panel del rol activo ya cargado
      navigate(from ?? paths.landing, { replace: true });
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-[18px]">
        <div>
          <h1 className="text-h2 font-bold tracking-tight text-ink">Inicia sesión</h1>
          <p className="mt-[3px] text-small text-ink-muted">Tu almuerzo, sin cola, sin estrés.</p>
        </div>

        {submit.error && (
          <StateBanner tone="error" title="No pudimos iniciar sesión">
            {submit.error.kind === 'unauthorized'
              ? 'Credenciales inválidas. Revisa tu correo y contraseña.'
              : submit.error.message}
          </StateBanner>
        )}

        <form onSubmit={handleSubmit(onValid)} className="space-y-[18px]" noValidate>
          <div className="space-y-3.5">
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
              autoComplete="current-password"
              placeholder="Tu contraseña"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
          <Button type="submit" full loading={submit.loading}>
            {submit.loading ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="text-center text-[13.5px] text-ink-soft">
          ¿Aún no tienes cuenta?{' '}
          <Link to={paths.register} className="font-bold text-brand-text hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
