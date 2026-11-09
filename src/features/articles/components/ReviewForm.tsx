import { useRef, useState, type FormEvent } from 'react'
import { isValidRating, REVIEW_MAX_LENGTH } from '../model/reviews'
import type { ReviewInput } from '../model/review.types'
import { StarInput } from './StarRating'

interface ReviewFormProps {
  submitLabel: string
  initialRating?: number
  initialText?: string
  autoFocus?: boolean
  onCancel?: () => void
  /** Se consulta antes de aceptar cualquier interacción: si devuelve false, no se hace nada (p. ej. visitante sin sesión). */
  canInteract: () => boolean
  /** Devuelve un mensaje de error, o null si se guardó. Ante un error se conserva lo escrito. */
  onSubmit: (input: ReviewInput) => Promise<string | null>
}

export function ReviewForm({ submitLabel, initialRating = 0, initialText = '', autoFocus = false, onCancel, canInteract, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating)
  const [text, setText] = useState(initialText)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const pending = useRef(false)
  const isTooLong = text.length > REVIEW_MAX_LENGTH

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !canInteract()) return
    if (!isValidRating(rating)) {
      setError('Elige una calificación de 1 a 5 estrellas.')
      return
    }
    if (isTooLong) return
    pending.current = true
    setIsSaving(true)
    setError('')
    const message = await onSubmit({ rating, reviewText: text.trim() })
    pending.current = false
    setIsSaving(false)
    if (message) setError(message)
  }

  return (
    <form className="review-form" noValidate onSubmit={(event) => void submit(event)}>
      <StarInput
        legend="Tu calificación (obligatoria)"
        value={rating}
        disabled={isSaving}
        onChange={(value) => {
          if (!canInteract()) return
          setRating(value)
          setError('')
        }}
      />
      <label className="review-form__text">
        <span>Tu reseña (opcional)</span>
        <textarea
          rows={4}
          placeholder="Cuéntale al autor y a otros lectores qué te pareció"
          aria-invalid={isTooLong || undefined}
          value={text}
          disabled={isSaving}
          autoFocus={autoFocus}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {error && <p className="review-form__error" role="alert">{error}</p>}
      <div className="review-form__footer">
        <span className={isTooLong ? 'review-form__count review-form__count--over' : 'review-form__count'}>
          {text.length} / {REVIEW_MAX_LENGTH}
        </span>
        <div className="review-form__actions">
          {onCancel && <button type="button" className="button button--secondary" disabled={isSaving} onClick={onCancel}>Cancelar</button>}
          <button type="submit" className="button button--primary" disabled={isSaving || isTooLong}>
            {isSaving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
