import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { validateLogin, type LoginErrors, type LoginField, type LoginValues } from '../model/loginValidation'
import { useAuth } from './useAuth'

// Mensaje único: no revela si falló el correo o la contraseña (ni si el usuario está inactivo).
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.'

export function useLogin() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function clearError(field: LoginField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  /** Devuelve true si la sesión quedó iniciada. */
  async function submit(values: LoginValues): Promise<boolean> {
    setFormError(null)
    const invalid = validateLogin(values)
    setFieldErrors(invalid)
    if (Object.keys(invalid).length > 0) return false

    setLoading(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
      return true
    } catch (e) {
      const { status, message } = toApiError(e)
      setFormError(status === 400 || status === 401 ? INVALID_CREDENTIALS : message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, fieldErrors, formError, clearError }
}
