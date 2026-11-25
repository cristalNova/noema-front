import type { ChangeEvent } from 'react'
import { TextArea } from '@/shared/components/TextArea'
import { TextField } from '@/shared/components/TextField'
import {
  BIO_MAX,
  NAME_MAX,
  SOCIAL_NETWORKS,
  USERNAME_MAX,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from '../model/profileValidation'
import './ProfileForm.css'

interface ProfileFormFieldsProps {
  values: ProfileFormValues
  errors: ProfileErrors
  onChange: (field: ProfileField, value: string) => void
  /** En la edición el nombre de usuario se muestra pero no se cambia. */
  usernameReadOnly?: boolean
}

/** Campos comunes a crear y editar un perfil. El formulario que lo usa aporta estado y envío. */
export function ProfileFormFields({ values, errors, onChange, usernameReadOnly = false }: ProfileFormFieldsProps) {
  function bind(field: ProfileField) {
    return {
      value: values[field],
      error: errors[field],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(field, e.target.value),
    }
  }

  return (
    <>
      <TextField
        label="Nombre de usuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={USERNAME_MAX}
        placeholder="maria.lopez"
        hint={usernameReadOnly ? 'No se puede cambiar.' : 'Único. Letras, números, guion bajo y punto.'}
        readOnly={usernameReadOnly}
        {...bind('username')}
      />
      <TextField label="Nombre" autoComplete="name" maxLength={NAME_MAX} placeholder="María López" {...bind('name')} />

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
          <TextField key={key} label={label} type="url" inputMode="url" placeholder="https://…" {...bind(key)} />
        ))}
      </fieldset>
    </>
  )
}
