import { useEffect, useRef, useState } from 'react'
import type { ArticleStatus, ArticleSummary } from '../model/article.types'
import { STATUS_LABELS, STATUS_TRANSITIONS } from '../model/myArticles'

interface Props {
  article: ArticleSummary
  action: 'delete' | 'status'
  pending: boolean
  onClose: () => void
  onConfirm: (status?: ArticleStatus) => Promise<string | null>
}

export function ArticleActionDialog({ article, action, pending, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState(STATUS_TRANSITIONS[article.status][0])
  const [error, setError] = useState('')
  const deleting = action === 'delete'

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setError('')
    const message = await onConfirm(deleting ? undefined : status)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog ref={dialog} className="article-dialog" aria-labelledby="action-title" aria-describedby="action-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}>
      <h2 id="action-title">{deleting ? '¿Eliminar ensayo?' : 'Cambiar estado'}</h2>
      <p className="article-dialog__title">{article.title}</p>
      <p id="action-description">{deleting ? 'Esta acción es definitiva. Se eliminará el ensayo y no podrás recuperarlo.' : 'Elige el nuevo estado de tu ensayo.'}</p>
      {!deleting && <><label htmlFor="next-status">Nuevo estado</label><select id="next-status" value={status} disabled={pending} onChange={(event) => setStatus(event.target.value as ArticleStatus)}>{STATUS_TRANSITIONS[article.status].map((next) => <option value={next} key={next}>{STATUS_LABELS[next]}</option>)}</select>{status === 'PUBLISHED' && <p>Al publicarlo, estará disponible para los lectores con acceso.</p>}</>}
      {error && <p className="status-message--error" role="alert">{error}</p>}
      <div className="article-dialog__actions">
        <button ref={cancel} className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button className={`button ${deleting ? 'article-delete-button' : 'button--primary'}`} type="button" disabled={pending} onClick={() => void confirm()}>{pending ? 'Procesando…' : deleting ? 'Eliminar definitivamente' : 'Guardar estado'}</button>
      </div>
    </dialog>
  )
}
