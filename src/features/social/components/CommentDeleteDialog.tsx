import { useEffect, useRef, useState } from 'react'
import type { CommentNode } from '../model/comment.types'
import { countReplies } from '../model/comments'
import './PostDeleteDialog.css'

interface CommentDeleteDialogProps {
  node: CommentNode
  onClose: () => void
  /** Devuelve un mensaje de error, o null si la eliminación terminó bien. */
  onConfirm: () => Promise<string | null>
}

export function CommentDeleteDialog({ node, onClose, onConfirm }: CommentDeleteDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const replies = countReplies(node)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setIsDeleting(true)
    setError('')
    const message = await onConfirm()
    setIsDeleting(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="post-dialog"
      aria-busy={isDeleting}
      aria-labelledby="comment-dialog-title"
      aria-describedby="comment-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!isDeleting) onClose()
      }}
    >
      <h2 id="comment-dialog-title">¿Eliminar comentario?</h2>
      <blockquote className="post-dialog__quote">{node.comment.content}</blockquote>
      <p id="comment-dialog-description">
        {replies > 0 && `También se eliminarán ${replies === 1 ? 'su respuesta' : `sus ${replies} respuestas`}. `}
        Esta acción es definitiva.
      </p>
      {error && <p className="post-dialog__error" role="alert">{error}</p>}
      <div className="post-dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" disabled={isDeleting} onClick={onClose}>Cancelar</button>
        <button type="button" className="button post-dialog__confirm" disabled={isDeleting} onClick={() => void confirm()}>
          {isDeleting ? 'Eliminando…' : 'Eliminar definitivamente'}
        </button>
      </div>
    </dialog>
  )
}
