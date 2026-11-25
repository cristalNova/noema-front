import { useId, type TextareaHTMLAttributes } from 'react'
import './TextField.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export function TextArea({ label, error, hint, ...rest }: TextAreaProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error ?? hint

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="field__input field__input--area"
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...rest}
      />
      {message && (
        <p id={messageId} className={error ? 'field__msg field__msg--error' : 'field__msg'}>
          {message}
        </p>
      )}
    </div>
  )
}
