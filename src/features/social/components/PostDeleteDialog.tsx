import { useEffect, useRef, useState } from 'react'
import type { Post } from '../model/post.types'
import './PostDeleteDialog.css'

interface PostDeleteDialogProps {
  post: Post
  pending: boolean
  onClose: () => void
  /** Devuelve un mensaje de error, o null si la eliminación terminó bien. */
  onConfirm: () => Promise<string | null>
}

export function PostDeleteDialog({ post, pending, onClose, onConfirm }: PostDeleteDialogProps) {
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
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="post-dialog"
      aria-busy={pending}
      aria-labelledby="post-dialog-title"
      aria-describedby="post-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <h2 id="post-dialog-title">¿Eliminar publicación?</h2>
      {post.content && <blockquote className="post-dialog__quote">{post.content}</blockquote>}
      <p id="post-dialog-description">Esta acción es definitiva y no podrás recuperarla.</p>
      {error && <p className="post-dialog__error" role="alert">{error}</p>}
      <div className="post-dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" disabled={pending} onClick={onClose}>Cancelar</button>
        <button type="button" className="button post-dialog__confirm" disabled={pending} onClick={() => void confirm()}>
          {pending ? 'Eliminando…' : 'Eliminar definitivamente'}
        </button>
      </div>
    </dialog>
  )
}
