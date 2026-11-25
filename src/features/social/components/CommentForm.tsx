import { useRef, useState, type FormEvent } from 'react'
import { COMMENT_MAX_LENGTH } from '../model/comments'

interface CommentFormProps {
  label: string
  submitLabel: string
  initialValue?: string
  autoFocus?: boolean
  onCancel?: () => void
  /** Devuelve un mensaje de error, o null si se guardó. Ante un error se conserva el texto. */
  onSubmit: (content: string) => Promise<string | null>
}

export function CommentForm({ label, submitLabel, initialValue = '', autoFocus = false, onCancel, onSubmit }: CommentFormProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const pending = useRef(false)
  const content = value.trim()
  const isTooLong = value.length > COMMENT_MAX_LENGTH

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !content || isTooLong) return
    pending.current = true
    setIsSaving(true)
    setError('')
    const message = await onSubmit(content)
    pending.current = false
    setIsSaving(false)
    if (message) setError(message)
    else setValue('')
  }

  return (
    <form className="comment-form" onSubmit={(event) => void submit(event)}>
      <textarea
        aria-label={label}
        aria-invalid={isTooLong || undefined}
        placeholder={label}
        rows={3}
        value={value}
        disabled={isSaving}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && <p className="comment-form__error" role="alert">{error}</p>}
      <div className="comment-form__footer">
        <span className={isTooLong ? 'comment-form__count comment-form__count--over' : 'comment-form__count'}>
          {value.length} / {COMMENT_MAX_LENGTH}
        </span>
        <div className="comment-form__actions">
          {onCancel && <button type="button" className="button button--secondary" disabled={isSaving} onClick={onCancel}>Cancelar</button>}
          <button type="submit" className="button button--primary" disabled={isSaving || !content || isTooLong}>
            {isSaving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
