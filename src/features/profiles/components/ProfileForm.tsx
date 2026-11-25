import { useState, type FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { useCreateProfile } from '../hooks/useCreateProfile'
import type { Profile } from '../model/Profile'
import { EMPTY_PROFILE_FORM, type ProfileField, type ProfileFormValues } from '../model/profileValidation'
import { ProfileFormFields } from './ProfileFormFields'
import './ProfileForm.css'

interface ProfileFormProps {
  onCreated: (profile: Profile) => void
}

export function ProfileForm({ onCreated }: ProfileFormProps) {
  const { create, loading, fieldErrors, formError, clearError } = useCreateProfile()
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM)

  function handleChange(field: ProfileField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    clearError(field)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const profile = await create(values)
    if (profile) onCreated(profile)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <ProfileFormFields values={values} errors={fieldErrors} onChange={handleChange} />

      {formError && (
        <p className="profile-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" loading={loading}>
        {loading ? 'Guardando…' : 'Guardar perfil'}
      </Button>
    </form>
  )
}
