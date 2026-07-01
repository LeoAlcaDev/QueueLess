import { z } from 'zod';

// El RUC peruano es de 11 digitos y empieza en 10 (persona natural) o 20 (empresa). El
// correo de contacto es opcional, pero si lo llenan tiene que ser un correo valido.
export const profileSchema = z.object({
  ruc: z
    .string()
    .trim()
    .regex(/^(10|20)\d{9}$/, 'RUC inválido: 11 dígitos que empiezan en 10 o 20'),
  contactoTelefono: z.string().trim().max(20, 'Máximo 20 caracteres').optional(),
  contactoEmail: z.union([z.string().trim().email('Correo inválido'), z.literal('')]).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
