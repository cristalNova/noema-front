import type { PostAuthor } from '@/features/social/model/post.types'

export interface Review {
  id: number
  profileId: number
  // El listado la incluye; POST y PATCH devuelven la reseña sin esta relación.
  profile?: PostAuthor
  articleId: number
  /** De 1 a 5. */
  rating: number
  reviewText?: string | null
  createdAt: string
}

export interface ReviewInput {
  rating: number
  reviewText: string
}
