import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCollection } from '@/features/articles/api/collectionsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './CollectionsPage.css'

export function NewCollectionPage() {
  const navigate = useNavigate()
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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
      const created = await createCollection({ title: cleanTitle, description: cleanDescription })
      navigate('/app/collections', { replace: true, state: { notice: `Se creó “${created.title}”.` } })
    } catch (reason) {
      setRequestError(getErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell collection-form-page">
      <Link className="back-link" to="/app/collections">← Mis colecciones</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Espacio de escritura</p>
        <h1>Crear colección</h1>
        <p>Un lugar para reunir ensayos que dialogan entre sí.</p>
      </header>
      <form className="collections-page__sheet collection-form-page__form" onSubmit={submit} noValidate aria-busy={saving}>
        <h2>Nueva colección</h2>
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
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear colección'}</button>
      </form>
    </main>
  )
}

