import type { ApiError } from '@/shared/api'
import type { RegisterErrors, RegisterField } from '../model/registerValidation'

export interface RegisterFailure {
  fieldErrors: RegisterErrors
  formError: string | null
}

const FIELD_HINTS: [RegisterField, RegExp][] = [
  ['email', /correo|email/i],
  ['password', /contrase/i],
  ['phoneNumber', /tel[eé]fono|phone/i],
]

/** Reparte los mensajes del servidor entre los campos; lo que no encaja va al formulario. */
export function mapRegisterError(error: ApiError): RegisterFailure {
  const fieldErrors: RegisterErrors = {}
  const unmatched: string[] = []

  for (const message of error.messages) {
    const field =
      error.status === 409 ? 'email' : FIELD_HINTS.find(([, re]) => re.test(message))?.[0]
    if (field) fieldErrors[field] ??= message
    else unmatched.push(message)
  }

  return { fieldErrors, formError: unmatched.length ? unmatched.join(' ') : null }
}
