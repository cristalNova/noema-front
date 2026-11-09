import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import type { Profile } from '../model/Profile'
import { profileToFormValues, type ProfileField, type ProfileFormValues } from '../model/profileValidation'
import { ProfileFormFields } from './ProfileFormFields'
import './ProfileForm.css'

interface EditProfileFormProps {
  profile: Profile
  /** Recibe el perfil ya guardado para que la app lo refleje (barra de navegación, etc.). */
  onSaved: (profile: Profile) => void
}

export function EditProfileForm({ profile, onSaved }: EditProfileFormProps) {
  const { update, loading, fieldErrors, formError, clearError } = useUpdateProfile(profile)
  const [values, setValues] = useState<ProfileFormValues>(() => profileToFormValues(profile))
  const [saved, setSaved] = useState(false)

  function handleChange(field: ProfileField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    clearError(field)
    setSaved(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    const updated = await update(values)
    if (!updated) return
    // Muestra lo que quedó guardado (por ejemplo "sitio.com" normalizado a "https://sitio.com").
    setValues(profileToFormValues(updated))
    setSaved(true)
    onSaved(updated)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <ProfileFormFields values={values} errors={fieldErrors} onChange={handleChange} usernameReadOnly />

      {formError && (
        <p className="profile-form__error" role="alert">
          {formError}
        </p>
      )}
      {saved && (
        <p className="profile-form__saved" role="status">
          Cambios guardados. <Link to={`/profiles/${profile.id}`}>Ver mi perfil público</Link>
        </p>
      )}

      <Button type="submit" loading={loading}>
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
