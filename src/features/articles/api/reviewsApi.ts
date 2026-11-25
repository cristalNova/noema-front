import { httpClient } from '@/shared/api'
import type { Review, ReviewInput } from '../model/review.types'

/** Reseñas de un ensayo publicado, de la más reciente a la más antigua. Es público. */
export async function listReviews(articleId: number, signal?: AbortSignal): Promise<Review[]> {
  const { data } = await httpClient.get<Review[]>(`/reviews/article/${articleId}`, { signal })
  return data
}

/** El texto es opcional: si está vacío no se envía. */
export async function createReview(articleId: number, { rating, reviewText }: ReviewInput): Promise<Review> {
  const { data } = await httpClient.post<Review>('/reviews', {
    articleId,
    rating,
    ...(reviewText ? { reviewText } : {}),
  })
  return data
}

/** Aquí sí se envía el texto vacío, para que se pueda borrar una reseña escrita antes. */
export async function updateReview(id: number, { rating, reviewText }: ReviewInput): Promise<Review> {
  const { data } = await httpClient.patch<Review>(`/reviews/${id}`, { rating, reviewText })
  return data
}

/** DELETE /reviews/:id: 204. Solo su autor; 403 si es de otro perfil y 404 si ya no existe. */
export async function deleteReview(id: number): Promise<void> {
  await httpClient.delete(`/reviews/${id}`)
}
