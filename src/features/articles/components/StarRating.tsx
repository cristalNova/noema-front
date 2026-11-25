import { useId } from 'react'
import { MAX_RATING } from '../model/reviews'

const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

const ratingLabel = (value: number) => `${value} de ${MAX_RATING} estrellas`

/** Calificación solo de lectura. */
export function StarDisplay({ value }: { value: number }) {
  return (
    <span className="stars" role="img" aria-label={ratingLabel(value)}>
      {STARS.map((star) => <span key={star} aria-hidden="true" className={star <= Math.round(value) ? 'stars__star stars__star--on' : 'stars__star'}>★</span>)}
    </span>
  )
}

interface StarInputProps {
  legend: string
  /** 0 mientras no se haya elegido. */
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** Grupo de botones de opción: se maneja con teclado (flechas) y lo leen los lectores de pantalla. */
export function StarInput({ legend, value, disabled = false, onChange }: StarInputProps) {
  const name = useId()
  return (
    <fieldset className="star-input" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="star-input__stars">
        {STARS.map((star) => (
          <label key={star} className={star <= value ? 'star-input__star star-input__star--on' : 'star-input__star'}>
            <input type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{ratingLabel(star)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
