export interface RegisterValues {
  email: string
  password: string
  phoneNumber: string
}

export type RegisterField = keyof RegisterValues
export type RegisterErrors = Partial<Record<RegisterField, string>>

export const EMAIL_MAX = 255
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
export const PHONE_MAX = 20

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s-]+$/

/** Espeja las reglas del backend (correo válido, contraseña ≥ 8, teléfono ≤ 20). */
export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {}
  const email = values.email.trim()
  const phone = values.phoneNumber.trim()

  if (!email) errors.email = 'El correo electrónico es requerido'
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email))
    errors.email = 'Ingresa un correo electrónico válido'

  if (!values.password) errors.password = 'La contraseña es requerida'
  else if (values.password.length < PASSWORD_MIN)
    errors.password = `La contraseña debe tener mínimo ${PASSWORD_MIN} caracteres`
  else if (values.password.length > PASSWORD_MAX)
    errors.password = `La contraseña no puede exceder ${PASSWORD_MAX} caracteres`

  if (phone) {
    if (phone.length > PHONE_MAX)
      errors.phoneNumber = `El teléfono no puede exceder ${PHONE_MAX} caracteres`
    else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 7)
      errors.phoneNumber = 'Ingresa un teléfono válido (solo números, +, espacios o guiones)'
  }

  return errors
}
