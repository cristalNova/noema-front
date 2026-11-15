import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { useReviews } from '../hooks/useReviews'
import type { Review } from '../model/review.types'
import { averageRating, findReviewBy } from '../model/reviews'
import { DeleteReviewDialog } from './DeleteReviewDialog'
import { ReviewForm } from './ReviewForm'
import { StarDisplay } from './StarRating'
import './ReviewSection.css'

const PAGE_SIZE = 5

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function ReviewCard({ review, mine = false, onEdit, onDelete }: { review: Review; mine?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const name = review.profile?.name ?? 'Usuario'
  return (
    <article className={mine ? 'review review--mine' : 'review'}>
      <header className="review__header">
        <Link className="review__author" to={`/profiles/${review.profileId}`}>
          {review.profile?.profilePhoto
            ? <img className="review__avatar" src={review.profile.profilePhoto} alt="" />
            : <span className="review__avatar" aria-hidden="true">{initials(name)}</span>}
          <strong>{mine ? `${name} (tú)` : name}</strong>
        </Link>
        <div className="review__meta">
          <time className="review__date" dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time>
          {(onEdit || onDelete) && (
            <div className="review__actions">
              {onEdit && (
                <button type="button" className="review__icon-button" aria-label="Editar mi reseña" title="Editar mi reseña" onClick={onEdit}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button type="button" className="review__icon-button review__icon-button--danger" aria-label="Eliminar mi reseña" title="Eliminar mi reseña" onClick={onDelete}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      <StarDisplay value={review.rating} />
      {review.reviewText && <p className="review__text">{review.reviewText}</p>}
    </article>
  )
}

function ReviewsContent({ articleId, authorId }: { articleId: number; authorId: number }) {
  const { isAuthenticated } = useAuth()
  const { status: profileStatus, profile } = useMyProfile()
  const requireAuth = useRequireAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { reviews, isLoading, loadError, retry, create, update, remove } = useReviews(articleId)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const formBlock = useRef<HTMLDivElement>(null)

  const myProfileId = profile?.id ?? null
  const mine = findReviewBy(reviews, myProfileId)
  const others = reviews.filter((review) => review !== mine)
  const average = averageRating(reviews)
  const totalPages = Math.max(1, Math.ceil(others.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = others.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
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

  async function confirmDelete(): Promise<string | null> {
    if (!mine) return null
    setPendingDelete(true)
    const message = await remove(mine)
    setPendingDelete(false)
    if (message) return message
    setDeleting(false)
    setEditing(false)
    setNotice('Se eliminó tu reseña.')
    // La reseña (y el botón que abrió el diálogo) desaparecen: el foco pasa al formulario para escribir otra.
    requestAnimationFrame(() => formBlock.current?.querySelector<HTMLElement>('h3')?.focus())
    return null
  }

  function focusForm() {
    const radio = formBlock.current?.querySelector<HTMLInputElement>('input[type="radio"]')
    radio?.scrollIntoView({ block: 'center' })
    radio?.focus()
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

      <p className="reviews__notice" role="status">{notice}</p>

      {canShowForm && isOwnEssay && <p className="reviews__note">Este es tu ensayo: los demás lectores pueden calificarlo y reseñarlo.</p>}

      {canShowForm && !isOwnEssay && (mine ? (
        editing ? (
          <div className="reviews__mine reviews__mine--own" ref={formBlock}>
            <h3 tabIndex={-1}>Editar mi reseña</h3>
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
                if (!message) {
                  setEditing(false)
                  setNotice(unchanged ? '' : 'Se guardaron los cambios en tu reseña.')
                }
                return message
              }}
            />
          </div>
        ) : (
          <div className="reviews__mine reviews__mine--own" ref={formBlock}>
            <h3 tabIndex={-1}>Tu reseña</h3>
            <ReviewCard review={mine} mine onEdit={() => { setNotice(''); setEditing(true) }} onDelete={() => { setNotice(''); setDeleting(true) }} />
          </div>
        )
      ) : (
        <div className="reviews__mine" ref={formBlock}>
          <h3 tabIndex={-1}>¿Qué te pareció?</h3>
          <ReviewForm submitLabel="Publicar reseña" canInteract={ensureCanWrite} onSubmit={async (input) => { const message = await create(input); if (!message) setNotice(''); return message }} />
          {!isAuthenticated && <p className="reviews__note">Para reseñar necesitas <Link to="/login" state={{ from: location.pathname + location.search }}>iniciar sesión</Link>.</p>}
        </div>
      ))}

      {canShowForm && others.length === 0 && !mine && (
        <div className="reviews__empty">
          <h3>Este ensayo aún no tiene reseñas.</h3>
          <p>{isOwnEssay ? 'Cuando alguien lo lea y lo califique, su opinión aparecerá aquí.' : 'Sé la primera persona en opinar: tu calificación ayuda a otros lectores a decidir qué leer.'}</p>
          {!isOwnEssay && <button type="button" className="button button--primary" onClick={focusForm}>Escribir la primera reseña</button>}
        </div>
      )}
      {others.length > 0 && <>
        {mine && <h3 className="reviews__subheading">Opiniones de otros lectores</h3>}
        <ul className="reviews__list" aria-label="Reseñas de los lectores">
          {visible.map((review) => <li key={review.id}><ReviewCard review={review} /></li>)}
        </ul>
        {totalPages > 1 && (
          <nav className="reviews__pagination" aria-label="Paginación de reseñas">
            <button type="button" className="button button--secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button type="button" className="button button--secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </nav>
        )}
      </>}
      {deleting && mine && <DeleteReviewDialog review={mine} pending={pendingDelete} onClose={() => setDeleting(false)} onConfirm={confirmDelete} />}
    </section>
  )
}

/** Se remonta al cambiar de ensayo o de sesión para no mostrar datos del anterior. */
export function ReviewSection({ articleId, authorId }: { articleId: number; authorId: number }) {
  const { session } = useAuth()
  return <ReviewsContent key={`${articleId}:${session?.user.id ?? 'visitor'}`} articleId={articleId} authorId={authorId} />
}
