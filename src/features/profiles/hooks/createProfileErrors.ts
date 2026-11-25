import type { ApiError } from '@/shared/api'
import type { ProfileErrors, ProfileField } from '../model/profileValidation'

export interface CreateProfileFailure {
  fieldErrors: ProfileErrors
  formError: string | null
}

const USERNAME_TAKEN = 'Ese nombre de usuario ya está en uso. Prueba con otro.'

const FIELD_HINTS: [ProfileField, RegExp][] = [
  ['username', /username|usuario/i],
  ['name', /nombre/i],
  ['photoUrl', /foto/i],
  ['bio', /biograf/i],
  ['website', /sitio web/i],
]

/** Reparte los mensajes del servidor entre los campos; lo que no encaja va al formulario. */
export function mapCreateProfileError(error: ApiError): CreateProfileFailure {
  const fieldErrors: ProfileErrors = {}
  const unmatched: string[] = []

  for (const message of error.messages) {
    // 409 es "username en uso" o "el usuario ya tiene un perfil"; solo el primero es del campo.
    if (error.status === 409 && /username/i.test(message)) {
      fieldErrors.username = USERNAME_TAKEN
      continue
    }
    const field = error.status === 409 ? undefined : FIELD_HINTS.find(([, re]) => re.test(message))?.[0]
    if (field) fieldErrors[field] ??= message
    else unmatched.push(message)
  }

  return { fieldErrors, formError: unmatched.length ? unmatched.join(' ') : null }
}
