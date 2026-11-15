import { useEffect, useRef, useState } from 'react'
import type { Review } from '../model/review.types'
import { StarDisplay } from './StarRating'
import './ReviewSection.css'

interface Props {
  review: Review
  pending: boolean
  onClose: () => void
  /** Devuelve null si se eliminó, o el mensaje de error para mostrar en el diálogo. */
  onConfirm: () => Promise<string | null>
}

export function DeleteReviewDialog({ review, pending, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setError('')
    const message = await onConfirm()
    if (message) setError(message)
  }

  return (
    <dialog ref={dialog} className="review-dialog" aria-busy={pending} aria-labelledby="delete-review-title" aria-describedby="delete-review-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}>
      <h2 id="delete-review-title">¿Eliminar tu reseña?</h2>
      <div className="review-dialog__preview">
        <StarDisplay value={review.rating} />
        {review.reviewText && <p>{review.reviewText}</p>}
      </div>
      <p id="delete-review-description">Esta acción es definitiva: tu reseña dejará de aparecer en el ensayo y se recalculará el promedio. Después podrás escribir otra si quieres.</p>
      {error && <p className="review-dialog__error" role="alert">{error}</p>}
      <div className="review-dialog__actions">
        <button ref={cancel} className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button className="button review-dialog__danger" type="button" disabled={pending} onClick={() => void confirm()}>{pending ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
      </div>
    </dialog>
  )
}
