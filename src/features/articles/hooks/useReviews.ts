import { useEffect, useState } from 'react'
import { useMyProfile } from '@/features/profiles'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { createReview, listReviews, updateReview } from '../api/reviewsApi'
import type { Review, ReviewInput } from '../model/review.types'

/**
 * Carga y guarda las reseñas de un ensayo. Las operaciones devuelven el mensaje de error,
 * o null si terminaron bien. Quien la usa debe remontarla al cambiar de ensayo o de sesión.
 */
export function useReviews(articleId: number) {
  const { profile } = useMyProfile()
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listReviews(articleId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setReviews(data)
        setLoadError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [articleId, attempt])

  const reload = () => setAttempt((value) => value + 1)

  async function create(input: ReviewInput): Promise<string | null> {
    try {
      const saved = await createReview(articleId, input)
      if (profile) {
        const author = { id: profile.id, name: profile.name, username: profile.username, profilePhoto: profile.photoUrl ?? undefined }
        setReviews((previous) => [{ ...saved, profile: author }, ...(previous ?? [])])
      } else {
        reload()
      }
      return null
    } catch (reason) {
      if (toApiError(reason).status === 409) {
        // Ya existía (por ejemplo, desde otra pestaña): se muestra la existente para editarla.
        reload()
        return 'Ya habías reseñado este ensayo. Ahora puedes editar tu reseña.'
      }
      return getErrorMessage(reason)
    }
  }

  async function update(review: Review, input: ReviewInput): Promise<string | null> {
    try {
      const saved = await updateReview(review.id, input)
      setReviews((previous) => (previous ?? []).map((item) => (
        item.id === review.id ? { ...item, rating: saved.rating, reviewText: saved.reviewText } : item
      )))
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  return {
    reviews: reviews ?? [],
    isLoading: reviews === null && !loadError,
    loadError,
    retry: () => {
      setLoadError('')
      reload()
    },
    create,
    update,
  }
}
