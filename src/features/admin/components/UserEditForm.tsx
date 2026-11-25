import { useState, type FormEvent } from 'react'
import { TextField } from '@/shared/components/TextField'
import { updateUser, type AdminUser, type UpdateUserInput } from '../api/usersApi'
import { describeAdminError } from '../model/adminErrors'
import { validateUserForm, type UserFormErrors } from '../model/users'

interface UserEditFormProps {
  user: AdminUser
  onSaved: (user: AdminUser) => void
}

export function UserEditForm({ user, onSaved }: UserEditFormProps) {
  const [email, setEmail] = useState(user.email)
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '')
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [serverError, setServerError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setServerError('')

    const found = validateUserForm({ email, phoneNumber })
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const nextEmail = email.trim()
    const nextPhone = phoneNumber.trim() === '' ? null : phoneNumber.trim()
    const changes: UpdateUserInput = {}
    if (nextEmail !== user.email) changes.email = nextEmail
    if (nextPhone !== (user.phoneNumber || null)) changes.phoneNumber = nextPhone
    if (Object.keys(changes).length === 0) {
      setNotice('No hay cambios que guardar.')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateUser(user.id, changes)
      onSaved(updated)
      setNotice('Cambios guardados.')
    } catch (reason) {
      setServerError(describeAdminError(reason)) // incluye el 409 de correo duplicado
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="admin-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <TextField
        label="Correo electrónico"
        type="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Teléfono"
        type="tel"
        value={phoneNumber}
        error={errors.phoneNumber}
        hint="Opcional. Máximo 20 caracteres."
        onChange={(event) => setPhoneNumber(event.target.value)}
      />
      {serverError && <p className="admin-form__error" role="alert">{serverError}</p>}
      <p className="admin-form__notice" role="status">{notice}</p>
      <button type="submit" className="button button--primary" disabled={isSaving}>
        {isSaving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}