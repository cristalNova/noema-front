import type { PostType, PostVisibility } from './post.types'

export const POST_TYPE_LABELS: Record<Exclude<PostType, 'ORIGINAL'>, string> = {
  REPLY: 'Respuesta',
  REPOST: 'Republicación',
  QUOTE: 'Cita',
}

export const VISIBILITY_LABELS: Record<Exclude<PostVisibility, 'PUBLIC'>, string> = {
  FOLLOWERS: 'Solo seguidores',
  COMMUNITY: 'Solo comunidad',
}

export interface PostFilters {
  authorId?: number
  communityId?: number
}

function toId(value: string | null): number | undefined {
  const id = Number(value)
  return value !== null && Number.isSafeInteger(id) && id > 0 ? id : undefined
}

/** Los filtros viven en la URL para poder compartirlos y conservarlos al volver atrás. */
export function readPostFilters(params: URLSearchParams): PostFilters {
  return { authorId: toId(params.get('authorId')), communityId: toId(params.get('communityId')) }
}

export function readPage(params: URLSearchParams): number {
  return toId(params.get('page')) ?? 1
}
