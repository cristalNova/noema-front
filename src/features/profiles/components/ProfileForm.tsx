import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/shared/components/Button'
import { TextArea } from '@/shared/components/TextArea'
import { TextField } from '@/shared/components/TextField'
import { useCreateProfile } from '../hooks/useCreateProfile'
import type { Profile } from '../model/Profile'
import {
  BIO_MAX,
  EMPTY_PROFILE_FORM,
  NAME_MAX,
  SOCIAL_NETWORKS,
  USERNAME_MAX,
  type ProfileField,
  type ProfileFormValues,
} from '../model/profileValidation'
import './ProfileForm.css'

interface ProfileFormProps {
  onCreated: (profile: Profile) => void
}

export function ProfileForm({ onCreated }: ProfileFormProps) {
  const { create, loading, fieldErrors, formError, clearError } = useCreateProfile()
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE_FORM)

  function bind(field: ProfileField) {
    return {
      value: values[field],
      error: fieldErrors[field],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }))
        clearError(field)
      },
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const profile = await create(values)
    if (profile) onCreated(profile)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <TextField
        label="Nombre de usuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={USERNAME_MAX}
        placeholder="maria.lopez"
        hint="Único. Letras, números, guion bajo y punto."
        {...bind('username')}
      />
      <TextField
        label="Nombre"
        autoComplete="name"
        maxLength={NAME_MAX}
        placeholder="María López"
        {...bind('name')}
      />

      <fieldset className="profile-form__optional">
        <legend>Opcional</legend>
        <TextArea
          label="Biografía"
          maxLength={BIO_MAX}
          placeholder="Cuéntanos sobre ti"
          hint={`${values.bio.length}/${BIO_MAX}`}
          {...bind('bio')}
        />
        <TextField
          label="Foto de perfil (URL)"
          type="url"
          inputMode="url"
          placeholder="https://…/foto.png"
          {...bind('photoUrl')}
        />
        <TextField
          label="Sitio web"
          type="url"
          inputMode="url"
          placeholder="https://tusitio.com"
          {...bind('website')}
        />
        {SOCIAL_NETWORKS.map(({ key, label }) => (
          <TextField
            key={key}
            label={label}
            type="url"
            inputMode="url"
            placeholder="https://…"
            {...bind(key)}
          />
        ))}
      </fieldset>

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
