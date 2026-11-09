import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { profilesApi } from '../api/profilesApi'
import type { Profile } from '../model/Profile'
import {
  toProfileChanges,
  validateProfileEdit,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from '../model/profileValidation'
import { mapCreateProfileError } from './createProfileErrors'

/** Caso de uso: validar y guardar los cambios del perfil. Devuelve el perfil actualizado o null. */
export function useUpdateProfile(current: Profile) {
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function clearError(field: ProfileField) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  async function update(values: ProfileFormValues): Promise<Profile | null> {
    setFormError(null)

    const invalid = validateProfileEdit(values)
    setFieldErrors(invalid)
    if (Object.keys(invalid).length > 0) return null

    setLoading(true)
    try {
      return await profilesApi.update(toProfileChanges(values, current))
    } catch (e) {
      const failure = mapCreateProfileError(toApiError(e))
      setFieldErrors(failure.fieldErrors)
      setFormError(failure.formError)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, fieldErrors, formError, clearError }
}
