/**
 * Filtros de la pantalla de exploración. La URL es la única fuente de verdad:
 * /articles?tag=ideas&community=3&author=7&collection=12&page=2
 *
 * El backend (GET /articles) solo acepta UN valor por filtro y rechaza con 400
 * cualquier parámetro que no conozca (forbidNonWhitelisted), así que aquí solo
 * existen estos cuatro filtros y nunca se envían vacíos.
 */
export interface ExploreFilters {
  tag: string | null
  communityId: number | null
  authorId: number | null
  collectionId: number | null
}

export type FilterKey = keyof ExploreFilters

export const EXPLORE_PAGE_SIZE = 10
export const EMPTY_FILTERS: ExploreFilters = { tag: null, communityId: null, authorId: null, collectionId: null }

// Nombres de los parámetros en la URL
const PARAMS = { tag: 'tag', communityId: 'community', authorId: 'author', collectionId: 'collection' } as const

const MAX_TAG_LENGTH = 50 // @MaxLength(50) en FindArticlesQueryDto
const MAX_INT = 2_147_483_647 // un id fuera de rango de INT rompe la consulta en Postgres

function parsePositiveInt(raw: string | null): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_INT ? value : null
}

// El backend normaliza la etiqueta con trim + minúsculas; se hace igual aquí
// para que "?tag=Ideas" y "?tag=ideas" sean la misma búsqueda.
function parseTag(raw: string | null): string | null {
  const tag = raw?.trim().toLowerCase() ?? ''
  return tag.length > 0 && tag.length <= MAX_TAG_LENGTH ? tag : null
}

export function parseFilters(params: URLSearchParams): ExploreFilters {
  return {
    tag: parseTag(params.get(PARAMS.tag)),
    communityId: parsePositiveInt(params.get(PARAMS.communityId)),
    authorId: parsePositiveInt(params.get(PARAMS.authorId)),
    collectionId: parsePositiveInt(params.get(PARAMS.collectionId)),
  }
}

export function parsePage(params: URLSearchParams): number {
  return parsePositiveInt(params.get('page')) ?? 1
}

/** Solo escribe los filtros activos; la página 1 no se escribe. */
export function toSearchParams(filters: ExploreFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.tag) params.set(PARAMS.tag, filters.tag)
  if (filters.communityId) params.set(PARAMS.communityId, String(filters.communityId))
  if (filters.authorId) params.set(PARAMS.authorId, String(filters.authorId))
  if (filters.collectionId) params.set(PARAMS.collectionId, String(filters.collectionId))
  if (page > 1) params.set('page', String(page))
  return params
}

export function countActiveFilters(filters: ExploreFilters): number {
  return Object.values(filters).filter((value) => value !== null).length
}

export function filtersKey(filters: ExploreFilters): string {
  return toSearchParams(filters).toString()
}
