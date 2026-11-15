import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api/apiError'
import './CollectionsPage.css'

export interface CollectionFormValues {
  title: string
  description: string
}

interface CollectionFormProps {
  heading: string
  submitLabel: string
  initial?: CollectionFormValues
  /** Si se indica, se muestra un enlace para descartar los cambios y volver. */
  cancelTo?: string
  /** Lanza si falla: el formulario muestra el mensaje y conserva lo escrito. */
  onSubmit: (values: CollectionFormValues) => Promise<void>
}

// Formulario compartido por crear y editar colección: mismas reglas y mismos mensajes.
export function CollectionForm({ heading, submitLabel, initial, cancelTo, onSubmit }: CollectionFormProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState({ title: '', description: '' })
  const [requestError, setRequestError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    const nextErrors = {
      title: !cleanTitle ? 'El título es obligatorio.' : cleanTitle.length > 150 ? 'El título admite máximo 150 caracteres.' : '',
      description: !cleanDescription ? 'La descripción es obligatoria.' : '',
    }
    setErrors(nextErrors)
    if (nextErrors.title) { titleRef.current?.focus(); return }
    if (nextErrors.description) { descriptionRef.current?.focus(); return }
    setSaving(true)
    setRequestError('')
    try {
      await onSubmit({ title: cleanTitle, description: cleanDescription })
    } catch (reason) {
      setRequestError(getErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="collections-page__sheet collection-form-page__form" onSubmit={submit} noValidate aria-busy={saving}>
      <h2>{heading}</h2>
      <div className="collection-form-page__field">
        <label htmlFor="collection-title">Título *</label>
        <input ref={titleRef} id="collection-title" value={title} maxLength={151} onChange={(event) => { setTitle(event.target.value); setErrors((previous) => ({ ...previous, title: '' })) }} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'collection-title-error' : undefined} disabled={saving} />
        {errors.title && <p id="collection-title-error" role="alert">{errors.title}</p>}
      </div>
      <div className="collection-form-page__field">
        <label htmlFor="collection-description">Descripción *</label>
        <textarea ref={descriptionRef} id="collection-description" value={description} rows={5} onChange={(event) => { setDescription(event.target.value); setErrors((previous) => ({ ...previous, description: '' })) }} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'collection-description-error' : undefined} disabled={saving} />
        {errors.description && <p id="collection-description-error" role="alert">{errors.description}</p>}
      </div>
      {requestError && <p className="collection-form-page__error" role="alert">{requestError}</p>}
      <div className="collection-form-page__actions">
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : submitLabel}</button>
        {cancelTo && <Link className="button button--secondary" to={cancelTo} aria-disabled={saving}>Cancelar</Link>}
      </div>
    </form>
  )
}
