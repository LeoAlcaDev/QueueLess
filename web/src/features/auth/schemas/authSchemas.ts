import { z } from 'zod';

// Esquemas de validacion del area de acceso. Los mensajes van en espanol porque se muestran
// tal cual debajo de cada campo del formulario.

export const loginSchema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type LoginValues = z.infer<typeof loginSchema>;

const ROLES = ['CLIENTE', 'COMERCIO', 'REPARTIDOR'] as const;

export const registerSchema = z.object({
  nombreCompleto: z.string().min(1, 'Ingresa tu nombre completo'),
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  roles: z.array(z.enum(ROLES)).min(1, 'Elige al menos un rol'),
  // el checkbox arranca en false; el submit solo se habilita cuando el usuario lo marca
  terms: z.boolean().refine((aceptado) => aceptado === true, 'Debes aceptar los términos y condiciones'),
});

export type RegisterValues = z.infer<typeof registerSchema>;
