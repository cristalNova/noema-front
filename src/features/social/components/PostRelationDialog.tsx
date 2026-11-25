import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Post } from '../model/post.types'
import { POST_MAX_LENGTH } from '../model/posts'
import './PostActions.css'

export type RelationKind = 'REPLY' | 'QUOTE'

const COPY: Record<RelationKind, { title: (name: string) => string; label: string; placeholder: string; submit: string; pending: string }> = {
  REPLY: { title: (name) => `Responder a ${name}`, label: 'Tu respuesta', placeholder: 'Escribe tu respuesta…', submit: 'Responder', pending: 'Respondiendo…' },
  QUOTE: { title: (name) => `Citar a ${name}`, label: 'Tu comentario sobre esta publicación', placeholder: 'Añade tu comentario a la cita…', submit: 'Publicar cita', pending: 'Publicando…' },
}

interface PostRelationDialogProps {
  kind: RelationKind
  /** El post que se responde o se cita: se muestra como contexto mientras se escribe. */
  target: Post
  onClose: () => void
  /** Devuelve null si se publicó, o el mensaje de error para mostrar en el diálogo (se conserva lo escrito). */
  onSubmit: (content: string) => Promise<string | null>
}

function fallbackContent(post: Post) {
  return post.postType === 'REPOST' ? 'Republicó una publicación.' : 'Publicación sin contenido.'
}

/** Compositor para responder o citar: el post original queda a la vista, para escribir con su contexto. */
export function PostRelationDialog({ kind, target, onClose, onSubmit }: PostRelationDialogProps) {
  const copy = COPY[kind]
  const dialog = useRef<HTMLDialogElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const pending = useRef(false)
  const titleId = useId()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const tooLong = content.length > POST_MAX_LENGTH
  const canSubmit = content.trim().length > 0 && !tooLong && !isSaving

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    field.current?.focus()
    return () => element?.close()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || pending.current) return
    pending.current = true
    setIsSaving(true)
    setError('')
    const message = await onSubmit(content.trim())
    pending.current = false
    setIsSaving(false)
    if (message) setError(message)
  }

  return (
    <dialog
      ref={dialog}
      className="post-relation"
      aria-labelledby={titleId}
      aria-busy={isSaving}
      onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose() }}
    >
      <form onSubmit={(event) => void submit(event)} noValidate>
        <h2 id={titleId}>{copy.title(target.owner.name)}</h2>

        <blockquote className="post-relation__context" aria-label="Publicación original">
          <p className="post-relation__author"><strong>{target.owner.name}</strong>{target.owner.username && <small>@{target.owner.username}</small>}</p>
          <p className="post-relation__text">{target.content || fallbackContent(target)}</p>
        </blockquote>

        <label className="post-relation__label" htmlFor={`${titleId}-content`}>{copy.label}</label>
        <textarea
          ref={field}
          id={`${titleId}-content`}
          rows={5}
          value={content}
          placeholder={copy.placeholder}
          aria-invalid={tooLong || undefined}
          disabled={isSaving}
          onChange={(event) => setContent(event.target.value)}
        />
        {error && <p className="post-relation__error" role="alert">{error}</p>}

        <div className="post-relation__footer">
          <span className={tooLong ? 'post-relation__count post-relation__count--over' : 'post-relation__count'} aria-live="polite">{content.length} / {POST_MAX_LENGTH}</span>
          <div className="post-relation__actions">
            <button type="button" className="button button--secondary" disabled={isSaving} onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button--primary" disabled={!canSubmit}>{isSaving ? copy.pending : copy.submit}</button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
