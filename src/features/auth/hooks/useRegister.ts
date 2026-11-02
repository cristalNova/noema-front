import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { authApi } from '../api/authApi'
import {
  validateRegister,
  type RegisterErrors,
  type RegisterField,
  type RegisterValues,
} from '../model/registerValidation'
import { mapRegisterError } from './registerErrors'
import { useAuth } from './useAuth'

function userRoleIds(): number[] {
  const id = Number(import.meta.env.VITE_USER_ROLE_ID)
  return Number.isInteger(id) && id > 0 ? [id] : []
}

/**
 * Caso de uso: registrarse y dejar la sesión iniciada.
 * POST /users no devuelve token, así que se hace login con las mismas credenciales
 * para poder crear el perfil (POST /profiles exige JWT).
 */
export function useRegister() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function clearError(field: RegisterField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  /** Devuelve true si la cuenta quedó creada y con sesión. */
  async function register(values: RegisterValues): Promise<boolean> {
    setFormError(null)

    const invalid = validateRegister(values)
    setFieldErrors(invalid)
    if (Object.keys(invalid).length > 0) return false

    const roleIds = userRoleIds()
    if (roleIds.length === 0) {
      setFormError('Falta configurar VITE_USER_ROLE_ID.')
      return false
    }

    const email = values.email.trim()
    const phoneNumber = values.phoneNumber.trim() || undefined

    setLoading(true)
    try {
      await authApi.register({ email, password: values.password, phoneNumber }, roleIds)
    } catch (e) {
      const failure = mapRegisterError(toApiError(e))
      setFieldErrors(failure.fieldErrors)
      setFormError(failure.formError)
      setLoading(false)
      return false
    }

    try {
      await login({ email, password: values.password })
      return true
    } catch {
      setFormError(
        'Tu cuenta se creó, pero no pudimos iniciar sesión. Intenta ingresar desde el login.',
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  return { register, loading, fieldErrors, formError, clearError }
}
