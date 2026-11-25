import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { profilesApi } from '../api/profilesApi'
import type { Profile } from '../model/Profile'
import {
  toNewProfile,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from '../model/profileValidation'
import { mapCreateProfileError } from './createProfileErrors'

/** Caso de uso: validar y crear el perfil. Devuelve el perfil creado o null si falló. */
export function useCreateProfile() {
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function clearError(field: ProfileField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  async function create(values: ProfileFormValues): Promise<Profile | null> {
    setFormError(null)

    const invalid = validateProfile(values)
    setFieldErrors(invalid)
    if (Object.keys(invalid).length > 0) return null

    setLoading(true)
    try {
      return await profilesApi.create(toNewProfile(values))
    } catch (e) {
      const failure = mapCreateProfileError(toApiError(e))
      setFieldErrors(failure.fieldErrors)
      setFormError(failure.formError)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, fieldErrors, formError, clearError }
}
