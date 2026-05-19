import { z, type ZodError } from 'zod'

// Username rules: 3-30 chars, alphanumeric + underscore.
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/

// User-facing messages in Spanish — they are forwarded to the front
// end when a validation fails, hence the descriptive and per-field
// wording.
export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Introduce tu correo electrónico.' })
    .trim()
    .toLowerCase()
    .email('Introduce un correo electrónico válido.')
    .max(254, 'El correo electrónico es demasiado largo.'),
  username: z
    .string({ required_error: 'Introduce un nombre de usuario.' })
    .trim()
    .regex(usernameRegex, 'El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números o guion bajo.'),
  password: z
    .string({ required_error: 'Introduce una contraseña.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña es demasiado larga.'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
})

// Change password — requires current password to authorize and a new one
// that differs from the current. Length matches the register schema so we
// reuse the same Argon2id parameters.
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Introduce tu contraseña actual.' })
      .min(1, 'Introduce tu contraseña actual.')
      .max(128),
    newPassword: z
      .string({ required_error: 'Introduce una contraseña nueva.' })
      .min(8, 'La contraseña nueva debe tener al menos 8 caracteres.')
      .max(128, 'La contraseña nueva es demasiado larga.'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'La contraseña nueva debe ser distinta de la actual.',
    path: ['newPassword'],
  })

// Delete account — current password plus a literal "DELETE" confirmation.
export const deleteAccountSchema = z.object({
  password: z
    .string({ required_error: 'Introduce tu contraseña.' })
    .min(1, 'Introduce tu contraseña.')
    .max(128),
  confirm: z.literal('DELETE', {
    errorMap: () => ({ message: 'Escribe DELETE en mayúsculas para confirmar.' }),
  }),
})

// Extracts the first human-readable message from a ZodError. Meant
// to be used as the statusMessage of a 400 response — gives the user
// something useful instead of the generic "Invalid data".
export function firstZodMessage(err: ZodError, fallback = 'Datos no válidos.'): string {
  return err.errors[0]?.message || fallback
}

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
