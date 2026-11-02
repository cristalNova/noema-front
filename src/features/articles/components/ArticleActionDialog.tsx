import { useEffect, useRef, useState } from 'react'
import type { ArticleStatus, ArticleSummary } from '../model/article.types'
import { STATUS_ACTIONS, STATUS_CONFIRMATIONS } from '../model/myArticles'
import { ArticleStatusBadge } from './ArticleStatusBadge'
import './ArticleState.css'

interface Props {
  article: Pick<ArticleSummary, 'title' | 'status'>
  action: 'delete' | ArticleStatus
  pending: boolean
  onClose: () => void
  onConfirm: (status?: ArticleStatus) => Promise<string | null>
}

export function ArticleActionDialog({ article, action, pending, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
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
    const message = await onConfirm(action === 'delete' ? undefined : action)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog ref={dialog} className="article-dialog" aria-busy={pending} aria-labelledby="action-title" aria-describedby="action-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}>
      <h2 id="action-title">{action === 'delete' ? '¿Eliminar ensayo?' : `¿${STATUS_ACTIONS[action]}?`}</h2>
      <p className="article-dialog__title">{article.title}</p>
      <p id="action-description">{action === 'delete' ? 'Esta acción es definitiva. Se eliminará el ensayo y no podrás recuperarlo.' : STATUS_CONFIRMATIONS[action]}</p>
      {action !== 'delete' && <><p>Estado actual: <ArticleStatusBadge status={article.status} /></p><p>Estado al confirmar: <ArticleStatusBadge status={action} /></p></>}
      {error && <p className="status-message--error" role="alert">{error}</p>}
      <div className="article-dialog__actions">
        <button ref={cancel} className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button className={`button ${deleting ? 'article-delete-button' : 'button--primary'}`} type="button" disabled={pending} onClick={() => void confirm()}>{pending ? 'Procesando…' : action === 'delete' ? 'Eliminar definitivamente' : STATUS_ACTIONS[action]}</button>
      </div>
    </dialog>
  )
}
