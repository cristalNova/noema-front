import type { PaginationParams } from '../types/Paginated'

export const MAX_PAGE_SIZE = 100

/** Normaliza page/limit para no exceder lo que acepta el backend. */
export function toPageQuery({ page = 1, limit = 20 }: PaginationParams = {}) {
  return { page: Math.max(1, page), limit: Math.min(Math.max(1, limit), MAX_PAGE_SIZE) }
}

/** Lee `?page=` de la URL; cualquier valor que no sea un entero positivo cuenta como la página 1. */
export function readPageParam(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}
