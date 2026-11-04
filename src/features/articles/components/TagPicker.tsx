import { useEffect, useId, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { listArticleTags, type TagOption } from '../api/articleTagsApi'
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTag } from '../model/draftValidation'
import './TagPicker.css'

interface TagPickerProps {
  id: string
  name: string
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

const MAX_SUGGESTIONS = 8

/**
 * Selector de etiquetas con búsqueda: sugiere las etiquetas en uso (GET /article-tags),
 * permite crear una nueva y quitar cualquiera con un botón. Si el catálogo no carga,
 * se puede seguir escribiendo etiquetas a mano.
 */
export function TagPicker({ id, name, value, onChange, disabled, invalid, describedBy }: TagPickerProps) {
  const listboxId = useId()
  const [catalog, setCatalog] = useState<TagOption[]>([])
  const [catalogFailed, setCatalogFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listArticleTags(controller.signal).then((tags) => {
      if (!controller.signal.aborted) setCatalog(tags)
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogFailed(true)
    })
    return () => controller.abort()
  }, [])

  const normalizedQuery = normalizeTag(query)
  const atLimit = value.length >= MAX_TAGS
  const options = useMemo(() => {
    const available = catalog.filter(({ tag }) => !value.includes(tag) && tag.includes(normalizedQuery))
    const suggestions = available.slice(0, MAX_SUGGESTIONS).map(({ tag, articles }) => ({ tag, label: `#${tag}`, hint: `${articles} ${articles === 1 ? 'ensayo' : 'ensayos'}`, isNew: false }))
    const exists = value.includes(normalizedQuery) || catalog.some(({ tag }) => tag === normalizedQuery)
    if (normalizedQuery && !exists) suggestions.push({ tag: normalizedQuery, label: `Crear “${normalizedQuery}”`, hint: 'Nueva', isNew: true })
    return suggestions
  }, [catalog, value, normalizedQuery])

  function add(raw: string) {
    const tag = normalizeTag(raw)
    if (!tag || atLimit || tag.length > MAX_TAG_LENGTH) return
    if (value.includes(tag)) {
      setAnnouncement(`La etiqueta ${tag} ya estaba agregada.`)
    } else {
      onChange([...value, tag])
      setAnnouncement(`Etiqueta ${tag} agregada.`)
    }
    setQuery('')
    setActiveIndex(-1)
  }

  function remove(tag: string) {
    onChange(value.filter((current) => current !== tag))
    setAnnouncement(`Etiqueta ${tag} quitada.`)
    // El input puede estar deshabilitado por el límite hasta el siguiente render.
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (options.length === 0) return
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ',') {
      // Enter nunca debe enviar el formulario del ensayo desde este campo.
      event.preventDefault()
      const chosen = activeIndex >= 0 ? options[activeIndex]?.tag : query
      if (chosen) add(chosen)
    } else if (event.key === 'Escape') {
      if (open) { event.stopPropagation(); setOpen(false); setActiveIndex(-1) }
    } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  const showList = open && !disabled && !atLimit && options.length > 0

  return (
    <div className="tag-picker">
      {value.length > 0 && (
        <ul className="tag-picker__chips" aria-label="Etiquetas seleccionadas">
          {value.map((tag) => (
            <li key={tag} className="tag-picker__chip">
              <span>#{tag}</span>
              <button type="button" onClick={() => remove(tag)} disabled={disabled} aria-label={`Quitar etiqueta ${tag}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        value={query}
        maxLength={MAX_TAG_LENGTH}
        disabled={disabled || atLimit}
        placeholder={atLimit ? `Máximo ${MAX_TAGS} etiquetas` : 'Busca o escribe una etiqueta'}
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActiveIndex(-1) }}
        onKeyDown={onKeyDown}
      />
      {/* onMouseDown evita que el input pierda el foco antes de registrar el clic */}
      <ul id={listboxId} className="tag-picker__options" role="listbox" aria-label="Etiquetas sugeridas" hidden={!showList}>
        {options.map((option, index) => (
          <li key={option.tag} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex} className={`tag-picker__option${index === activeIndex ? ' is-active' : ''}`} onMouseDown={(event) => { event.preventDefault(); add(option.tag) }}>
            <span>{option.label}</span><small>{option.hint}</small>
          </li>
        ))}
      </ul>
      <p className="draft-hint" id={`${id}-hint`}>
        {value.length}/{MAX_TAGS} etiquetas. Pulsa Enter para agregar la que escribes.
        {catalogFailed && ' No se pudieron cargar las sugerencias, pero puedes escribir tus etiquetas.'}
      </p>
      <p className="draft-sr-only" role="status">{announcement}</p>
    </div>
  )
}
