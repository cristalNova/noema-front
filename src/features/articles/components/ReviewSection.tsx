import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { useReviews } from '../hooks/useReviews'
import type { Review } from '../model/review.types'
import { averageRating, findReviewBy } from '../model/reviews'
import { ReviewForm } from './ReviewForm'
import { StarDisplay } from './StarRating'
import './ReviewSection.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function ReviewCard({ review, mine = false, onEdit }: { review: Review; mine?: boolean; onEdit?: () => void }) {
  const name = review.profile?.name ?? 'Usuario'
  return (
    <article className="review">
      <header className="review__header">
        <Link className="review__author" to={`/profiles/${review.profileId}`}>
          {review.profile?.profilePhoto
            ? <img className="review__avatar" src={review.profile.profilePhoto} alt="" />
            : <span className="review__avatar" aria-hidden="true">{initials(name)}</span>}
          <strong>{mine ? `${name} (tú)` : name}</strong>
        </Link>
        <time className="review__date" dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time>
      </header>
      <StarDisplay value={review.rating} />
      {review.reviewText && <p className="review__text">{review.reviewText}</p>}
      {onEdit && <button type="button" className="review__edit" onClick={onEdit}>Editar mi reseña</button>}
    </article>
  )
}

function ReviewsContent({ articleId, authorId }: { articleId: number; authorId: number }) {
  const { isAuthenticated } = useAuth()
  const { status: profileStatus, profile } = useMyProfile()
  const requireAuth = useRequireAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { reviews, isLoading, loadError, retry, create, update } = useReviews(articleId)
  const [editing, setEditing] = useState(false)

  const myProfileId = profile?.id ?? null
  const mine = findReviewBy(reviews, myProfileId)
  const others = reviews.filter((review) => review !== mine)
  const average = averageRating(reviews)
  const isOwnEssay = myProfileId !== null && myProfileId === authorId
  // Hasta saber si ya reseñé no se muestra el formulario: evitaría ofrecer una reseña duplicada.
  const canShowForm = !isLoading && !loadError

  /** Sin sesión, lleva a iniciar sesión; sin perfil, a crearlo. */
  function ensureCanWrite(): boolean {
    if (!requireAuth('reseñar este ensayo')) return false
    if (profileStatus !== 'missing') return true
    navigate('/profile/new', { state: { from: location.pathname + location.search } })
    return false
  }

  return (
    <section className="reviews" aria-labelledby="reviews-heading" aria-busy={isLoading}>
      <header className="reviews__heading">
        <h2 id="reviews-heading">Reseñas</h2>
        {!isLoading && !loadError && (
          <span className="reviews__summary">
            {average === null ? 'Sin calificaciones todavía' : (
              <>
                <StarDisplay value={average} /> <strong>{average.toLocaleString('es-CO')}</strong> · {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </>
            )}
          </span>
        )}
      </header>

      {isLoading && <p className="status-message" role="status">Cargando reseñas…</p>}
      {loadError && (
        <div className="status-message status-message--error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
        </div>
      )}

      {canShowForm && isOwnEssay && <p className="reviews__note">Este es tu ensayo: los demás lectores pueden calificarlo y reseñarlo.</p>}

      {canShowForm && !isOwnEssay && (mine ? (
        editing ? (
          <div className="reviews__mine">
            <h3>Editar mi reseña</h3>
            <ReviewForm
              key={mine.id}
              submitLabel="Guardar cambios"
              initialRating={mine.rating}
              initialText={mine.reviewText ?? ''}
              autoFocus
              onCancel={() => setEditing(false)}
              canInteract={ensureCanWrite}
              onSubmit={async (input) => {
                const unchanged = input.rating === mine.rating && input.reviewText === (mine.reviewText ?? '')
                const message = unchanged ? null : await update(mine, input)
                if (!message) setEditing(false)
                return message
              }}
            />
          </div>
        ) : (
          <div className="reviews__mine">
            <h3>Tu reseña</h3>
            <p className="reviews__note">Ya reseñaste este ensayo. Puedes editar tu reseña, pero no publicar otra.</p>
            <ReviewCard review={mine} mine onEdit={() => setEditing(true)} />
          </div>
        )
      ) : (
        <div className="reviews__mine">
          <h3>¿Qué te pareció?</h3>
          <ReviewForm submitLabel="Publicar reseña" canInteract={ensureCanWrite} onSubmit={create} />
          {!isAuthenticated && <p className="reviews__note">Para reseñar necesitas <Link to="/login" state={{ from: location.pathname + location.search }}>iniciar sesión</Link>.</p>}
        </div>
      ))}

      {canShowForm && others.length === 0 && !mine && <p className="reviews__empty">Todavía no hay reseñas. Sé la primera persona en opinar.</p>}
      {others.length > 0 && (
        <ul className="reviews__list" aria-label="Reseñas de los lectores">
          {others.map((review) => <li key={review.id}><ReviewCard review={review} /></li>)}
        </ul>
      )}
    </section>
  )
}

/** Se remonta al cambiar de ensayo o de sesión para no mostrar datos del anterior. */
export function ReviewSection({ articleId, authorId }: { articleId: number; authorId: number }) {
  const { session } = useAuth()
  return <ReviewsContent key={`${articleId}:${session?.user.id ?? 'visitor'}`} articleId={articleId} authorId={authorId} />
}
