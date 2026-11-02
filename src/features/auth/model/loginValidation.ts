export interface LoginValues {
  email: string
  password: string
}

export type LoginField = keyof LoginValues
export type LoginErrors = Partial<Record<LoginField, string>>

/** Solo exige que no estén vacíos; la validez la decide el servidor. */
export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {}
  if (!values.email.trim()) errors.email = 'Ingresa tu correo electrónico'
  if (!values.password) errors.password = 'Ingresa tu contraseña'
  return errors
}
