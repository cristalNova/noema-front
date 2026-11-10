import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ApiError } from '../../../shared/api/apiError'

const MAX_NAME_LENGTH = 100
const MAX_TOPIC_LENGTH = 100
const MAX_TAGS = 10
const MAX_TAG_LENGTH = 50

export interface CommunityFormValues {
  name: string
  topic: string
  description: string
  isPremium: boolean
  tags: string[]
}

interface FormErrors {
  name?: string
  topic?: string
  tags?: string
  submit?: string
}

type Mode = 'create' | 'edit'

interface CommunityFormProps {
  mode: Mode
  initialValues?: CommunityFormValues
  /** Debe rechazar la promesa si algo falla: el formulario muestra el error y conserva lo escrito. */
  onSubmit: (values: CommunityFormValues) => Promise<void>
  onCancel: () => void
}

const EMPTY_VALUES: CommunityFormValues = { name: '', topic: '', description: '', isPremium: false, tags: [] }

function validateForm(name: string, topic: string, tags: string[]): FormErrors {
  const errors: FormErrors = {}
  if (!name.trim()) errors.name = 'El nombre de la comunidad es obligatorio'
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'El nombre no puede superar los 100 caracteres'
  if (!topic.trim()) errors.topic = 'La temática es obligatoria'
  else if (topic.length > MAX_TOPIC_LENGTH) errors.topic = 'La temática no puede superar los 100 caracteres'
  if (tags.length > MAX_TAGS) errors.tags = 'No puedes añadir más de 10 etiquetas'
  else if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) errors.tags = 'Cada etiqueta no puede superar los 50 caracteres'
  return errors
}

function getServerErrors(error: unknown, mode: Mode): FormErrors {
  const fallback = mode === 'edit' ? 'No se pudieron guardar los cambios. Intenta de nuevo.' : 'No se pudo crear la comunidad. Intenta de nuevo.'
  // Un Error propio (por ejemplo, "se guardaron los datos pero no las etiquetas") ya trae su mensaje.
  if (!(error instanceof ApiError)) return { submit: error instanceof Error && error.message ? error.message : fallback }
  if (error.status === 409) return { name: 'Ya existe una comunidad con ese nombre' }
  if (error.status === 401) return { submit: 'Tu sesión no es válida. Inicia sesión de nuevo.' }
  if (error.status === 403) {
    return { submit: error.messages.join(' ') || 'No tienes permisos para editar esta comunidad.' }
  }
  if (error.status === 404) {
    return { submit: mode === 'edit' ? 'Esta comunidad ya no existe.' : 'Necesitas un perfil para crear una comunidad.' }
  }

  const errors: FormErrors = {}
  const message = error.messages.join(' ')
  if (/name|nombre/i.test(message)) errors.name = message
  else if (/topic|temática|tematica/i.test(message)) errors.topic = message
  else if (/tag|etiqueta/i.test(message)) errors.tags = message
  else errors.submit = message
  return errors
}

export function CommunityForm({ mode, initialValues = EMPTY_VALUES, onSubmit, onCancel }: CommunityFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [topic, setTopic] = useState(initialValues.topic)
  const [description, setDescription] = useState(initialValues.description)
  const [isPremium, setIsPremium] = useState(initialValues.isPremium)
  const [tags, setTags] = useState<string[]>(initialValues.tags)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    const nextErrors: FormErrors = {}
    if (tag.length > MAX_TAG_LENGTH) nextErrors.tags = 'Cada etiqueta no puede superar los 50 caracteres'
    else if (tags.length >= MAX_TAGS) nextErrors.tags = 'No puedes añadir más de 10 etiquetas'
    else if (tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      nextErrors.tags = 'Esta etiqueta ya está seleccionada'
    } else {
      setTags((current) => [...current, tag])
      setTagInput('')
    }
    setErrors((current) => ({ ...current, tags: nextErrors.tags }))
  }

  const removeTag = (tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove))
    setErrors((current) => ({ ...current, tags: undefined }))
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag()
    }
    if (event.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateForm(name, topic, tags)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), topic: topic.trim(), description: description.trim(), isPremium, tags })
    } catch (error: unknown) {
      setErrors(getServerErrors(error, mode))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="community-create" onSubmit={handleSubmit} noValidate>
      <section className="community-create__section" aria-labelledby="community-create-general">
        <div className="community-create__section-heading">
          <p className="eyebrow">01 · Base</p>
          <h2 id="community-create-general">Información general</h2>
        </div>
        <div className="community-create__fields">
          <div className="community-create__field">
            <label htmlFor="community-name">Nombre de la comunidad <span aria-hidden="true">*</span></label>
            <input
              id="community-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Ej. Club de lectura contemporánea"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'community-name-error' : 'community-name-count'}
            />
            <div className="community-create__field-meta">
              {errors.name && <span id="community-name-error" className="community-create__error" role="alert">{errors.name}</span>}
              <span id="community-name-count" className="community-create__counter">{name.length}/{MAX_NAME_LENGTH}</span>
            </div>
          </div>

          <div className="community-create__field">
            <label htmlFor="community-topic">Temática <span aria-hidden="true">*</span></label>
            <input
              id="community-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={MAX_TOPIC_LENGTH}
              placeholder="Ej. Literatura latinoamericana"
              aria-invalid={Boolean(errors.topic)}
              aria-describedby={errors.topic ? 'community-topic-error' : 'community-topic-count'}
            />
            <div className="community-create__field-meta">
              {errors.topic && <span id="community-topic-error" className="community-create__error" role="alert">{errors.topic}</span>}
              <span id="community-topic-count" className="community-create__counter">{topic.length}/{MAX_TOPIC_LENGTH}</span>
            </div>
          </div>

          <div className="community-create__field community-create__field--wide">
            <label htmlFor="community-description">Descripción</label>
            <textarea
              id="community-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe qué encontrará una persona al unirse a tu comunidad."
              rows={6}
            />
          </div>
        </div>
      </section>

      <section className="community-create__section" aria-labelledby="community-create-tags">
        <div className="community-create__section-heading">
          <p className="eyebrow">02 · Identidad</p>
          <h2 id="community-create-tags">Etiquetas</h2>
          <p>Añade hasta 10 palabras para ayudar a encontrar tu comunidad.</p>
        </div>
        <div className="community-create__field">
          <label htmlFor="community-tags-input">Añadir etiqueta</label>
          <div className="community-create__tag-input">
            <input
              id="community-tags-input"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              maxLength={MAX_TAG_LENGTH}
              placeholder="Escribe y pulsa Enter"
              aria-invalid={Boolean(errors.tags)}
              aria-describedby="community-tags-help"
            />
            <button type="button" className="button button--secondary" onClick={addTag} disabled={!tagInput.trim()}>
              Añadir
            </button>
          </div>
          <p id="community-tags-help" className="community-create__hint">
            {tags.length}/{MAX_TAGS} seleccionadas · Cada etiqueta admite hasta {MAX_TAG_LENGTH} caracteres.
          </p>
          {errors.tags && <p className="community-create__error" role="alert">{errors.tags}</p>}
          {tags.length === 0 ? (
            <p className="community-create__empty-tags">Todavía no has añadido etiquetas.</p>
          ) : (
            <ul className="community-create__tags" aria-label="Etiquetas seleccionadas">
              {tags.map((tag) => (
                <li className="community-create__tag-chip" key={tag}>
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} aria-label={`Eliminar etiqueta ${tag}`}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="community-create__section" aria-labelledby="community-create-premium">
        <div className="community-create__section-heading">
          <p className="eyebrow">03 · Acceso</p>
          <h2 id="community-create-premium">Comunidad premium</h2>
          <p className="community-create__access-help">
            Las comunidades premium pueden requerir una suscripción y aprobación antes de permitir el acceso.
          </p>
        </div>
        <label className={`community-create__switch-row${isPremium ? ' community-create__switch-row--active' : ''}`}>
          <span>
            <strong>Marcar como premium</strong>
            <small>Configura esta propiedad para diferenciar tu comunidad. No implica ningún cobro.</small>
          </span>
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(event) => setIsPremium(event.target.checked)}
            role="switch"
            aria-checked={isPremium}
          />
          <span className="community-create__switch" aria-hidden="true"><span /></span>
        </label>
      </section>

      {errors.submit && <p className="community-create__submit-error" role="alert">{errors.submit}</p>}
      <div className="community-create__actions">
        <button type="button" className="button button--secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {mode === 'edit'
            ? (isSubmitting ? 'Guardando cambios…' : 'Guardar cambios')
            : (isSubmitting ? 'Creando comunidad…' : 'Crear comunidad')}
        </button>
      </div>
    </form>
  )
}
