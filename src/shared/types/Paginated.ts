/** Respuesta paginada del backend: `?page=1&limit=20` (limit máx. 100). */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}
