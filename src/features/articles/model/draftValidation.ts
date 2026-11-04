import { toApiError } from '../../../shared/api/apiError'
import type { DraftErrors, DraftField, DraftValues } from './article.types'

export const MAX_TAGS = 10
export const MAX_TAG_LENGTH = 50
const MAX_COLLECTION_POSITION = 2147483647

// Igual que el backend (trim + minúsculas) para que "NestJS" y "nestjs" sean la misma etiqueta.
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/gu, ' ').toLowerCase()
}

export function validateDraft(input: DraftValues): DraftErrors {
  const errors: DraftErrors = {}
  if (!input.title.trim()) errors.title = ['El título es obligatorio']
  else if (input.title.length > 200) errors.title = ['El título no puede exceder 200 caracteres']
  if (input.description.length > 500) errors.description = ['La descripción no puede exceder 500 caracteres']
  if (!input.content.trim()) errors.content = ['El contenido es obligatorio']
  if (input.tags.length > MAX_TAGS) errors.tags = [`Un ensayo admite máximo ${MAX_TAGS} etiquetas`]
  else if (input.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) errors.tags = [`Cada etiqueta admite máximo ${MAX_TAG_LENGTH} caracteres`]
  const position = input.collectionPosition
  if (position !== null) {
    if (input.collectionId === null) errors.collectionPosition = ['Elige una colección para definir la posición']
    else if (!Number.isInteger(position) || position < 1) errors.collectionPosition = ['La posición debe ser un entero de al menos 1']
    else if (position > MAX_COLLECTION_POSITION) errors.collectionPosition = ['La posición es demasiado grande']
  }
  return errors
}

// Nest devuelve mensajes planos: algunos incluyen el nombre del DTO y otros
// los mensajes personalizados en español. Conservar también los no asociados.
export function getDraftErrors(error: unknown): { fields: DraftErrors; general: string[] } {
  const apiError = toApiError(error)
  const fields: DraftErrors = {}
  const general: string[] = []
  // collectionPosition va antes que collectionId: su mensaje también menciona "colección".
  const patterns: [DraftField, RegExp][] = [
    ['title', /\btitle\b|título|titulo/i],
    ['description', /\bdescription\b|descripción|descripcion/i],
    ['content', /\bcontent\b|contenido/i],
    ['isPremium', /\bisPremium\b|premium/i],
    ['communityId', /\bcommunityId\b|comunidad/i],
    ['collectionPosition', /\bcollectionPosition\b|posición|posicion/i],
    ['collectionId', /\bcollectionId\b|colección|coleccion/i],
    ['tags', /\btags?\b|etiqueta/i],
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
