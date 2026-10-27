import type { PaginationParams } from '../types/Paginated'

export const MAX_PAGE_SIZE = 100

/** Normaliza page/limit para no exceder lo que acepta el backend. */
export function toPageQuery({ page = 1, limit = 20 }: PaginationParams = {}) {
  return { page: Math.max(1, page), limit: Math.min(Math.max(1, limit), MAX_PAGE_SIZE) }
}
