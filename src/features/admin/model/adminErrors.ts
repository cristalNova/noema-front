import { toApiError } from '@/shared/api/apiError'

/** Mensajes claros para 401 y 403; el resto usa el mensaje del servidor. */
export function describeAdminError(reason: unknown): string {
  const error = toApiError(reason)
  if (error.status === 401) return 'Tu sesión venció o no es válida. Inicia sesión de nuevo.'
  if (error.status === 403) return 'No tienes permiso para realizar esta acción.'
  return error.message
}