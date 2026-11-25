import type { Review } from './review.types'

export const REVIEW_MAX_LENGTH = 2000
export const MAX_RATING = 5

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_RATING
}

/** Promedio con un decimal, o null si todavía no hay reseñas. */
export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return Math.round((total / reviews.length) * 10) / 10
}

export function findReviewBy(reviews: Review[], profileId: number | null): Review | undefined {
  return profileId === null ? undefined : reviews.find((review) => review.profileId === profileId)
}
