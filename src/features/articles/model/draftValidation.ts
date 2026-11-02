import { toApiError } from '../../../shared/api/apiError'
import type { DraftErrors, DraftField, DraftInput } from './article.types'

export function validateDraft(input: DraftInput): DraftErrors {
  const errors: DraftErrors = {}
  if (!input.title.trim()) errors.title = ['El título es obligatorio']
  else if (input.title.length > 200) errors.title = ['El título no puede exceder 200 caracteres']
  if (input.description.length > 500) errors.description = ['La descripción no puede exceder 500 caracteres']
  if (!input.content.trim()) errors.content = ['El contenido es obligatorio']
  return errors
}

// Nest devuelve mensajes planos: algunos incluyen el nombre del DTO y otros
// los mensajes personalizados en español. Conservar también los no asociados.
export function getDraftErrors(error: unknown): { fields: DraftErrors; general: string[] } {
  const apiError = toApiError(error)
  const fields: DraftErrors = {}
  const general: string[] = []
  const patterns: [DraftField, RegExp][] = [
    ['title', /\btitle\b|título|titulo/i],
    ['description', /\bdescription\b|descripción|descripcion/i],
    ['content', /\bcontent\b|contenido/i],
    ['isPremium', /\bisPremium\b|premium/i],
    ['communityId', /\bcommunityId\b|comunidad/i],
  ]
  if (apiError.status === 401) {
    return { fields, general: ['Tu sesión no está disponible o venció. Inicia sesión para guardar. Tu texto sigue en el editor.'] }
  }
  for (const message of apiError.messages) {
    const field = patterns.find(([, pattern]) => pattern.test(message))?.[0]
    if (field) (fields[field] ??= []).push(message)
    else general.push(message)
  }
  return { fields, general }
}
