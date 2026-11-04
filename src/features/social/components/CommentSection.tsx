import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { Pagination } from '@/shared/components/Pagination'
import { useComments } from '../hooks/useComments'
import type { CommentNode, CommentTarget } from '../model/comment.types'
import { buildCommentTree, COMMENTS_PER_PAGE } from '../model/comments'
import { CommentDeleteDialog } from './CommentDeleteDialog'
import { CommentForm } from './CommentForm'
import { CommentItem, type CommentActions } from './CommentItem'
import './CommentSection.css'

// Parámetro propio: el detalle de un post ya usa "page" para sus respuestas.
const PAGE_PARAM = 'commentsPage'

function CommentThreads({ target }: { target: CommentTarget }) {
  const { isAuthenticated } = useAuth()
  const { status: profileStatus, profile } = useMyProfile()
  const requireAuth = useRequireAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { comments, isLoading, loadError, retry, add, edit, remove } = useComments(target)
  const [toDelete, setToDelete] = useState<CommentNode | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)

  const threads = useMemo(() => buildCommentTree(comments), [comments])
  const lastPage = Math.max(1, Math.ceil(threads.length / COMMENTS_PER_PAGE))
  const requestedPage = Number(searchParams.get(PAGE_PARAM))
  // Si se borró el último hilo de la página, se muestra la última que siga existiendo.
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, lastPage) : 1
  const visibleThreads = threads.slice((page - 1) * COMMENTS_PER_PAGE, page * COMMENTS_PER_PAGE)
  const canWrite = isAuthenticated && profileStatus !== 'missing'

  function setPage(next: number) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next <= 1) params.delete(PAGE_PARAM)
      else params.set(PAGE_PARAM, String(next))
      return params
    }, { preventScrollReset: true })
  }

  function ensureCanWrite(reason: string): boolean {
    if (!requireAuth(reason)) return false
    if (profileStatus !== 'missing') return true
    navigate('/profile/new', { state: { from: location.pathname + location.search } })
    return false
  }

  const actions: CommentActions = {
    myProfileId: profile?.id ?? null,
    ensureCanWrite,
    reply: (content, parent) => add(content, parent.id),
    edit,
    requestDelete: (node, button) => {
      trigger.current = button
      setToDelete(node)
    },
  }

  function closeDialog() {
    setToDelete(null)
    // Si el comentario se eliminó, su botón ya no existe: el foco pasa al título de la sección.
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else heading.current?.focus()
    })
  }

  return (
    <section className="comments" aria-labelledby="comments-heading" aria-busy={isLoading}>
      <header className="comments__heading">
        <h2 id="comments-heading" ref={heading} tabIndex={-1}>Comentarios</h2>
        {!isLoading && !loadError && <span>{comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}</span>}
      </header>

      {canWrite ? (
        <CommentForm
          label="Escribe un comentario"
          submitLabel="Comentar"
          onSubmit={async (content) => {
            const message = await add(content)
            // Se ordenan del más antiguo al más reciente: el nuevo queda en la última página.
            if (!message) setPage(Math.ceil((threads.length + 1) / COMMENTS_PER_PAGE))
            return message
          }}
        />
      ) : (
        <div className="comments__invite">
          <p>{isAuthenticated ? 'Crea tu perfil para unirte a la conversación.' : 'Inicia sesión para unirte a la conversación.'}</p>
          <button type="button" className="button button--primary" onClick={() => ensureCanWrite('comentar')}>Comentar</button>
        </div>
      )}

      {isLoading && <p className="status-message" role="status">Cargando comentarios…</p>}
      {loadError && (
        <div className="status-message status-message--error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
        </div>
      )}
      {!isLoading && !loadError && threads.length === 0 && <p className="comments__empty">Todavía no hay comentarios. Empieza la conversación.</p>}

      {visibleThreads.length > 0 && (
        <ul className="comment-list comments__threads" aria-label="Comentarios">
          {visibleThreads.map((node) => <CommentItem key={node.comment.id} node={node} actions={actions} />)}
        </ul>
      )}
      {threads.length > COMMENTS_PER_PAGE && (
        <Pagination page={page} total={threads.length} limit={COMMENTS_PER_PAGE} label="Paginación de comentarios" onPageChange={setPage} />
      )}

      {toDelete && (
        <CommentDeleteDialog
          key={toDelete.comment.id}
          node={toDelete}
          onClose={closeDialog}
          onConfirm={() => remove(toDelete.comment)}
        />
      )}
    </section>
  )
}

/** Se remonta al cambiar de ensayo, post o sesión para no mostrar datos del anterior. */
export function CommentSection({ target }: { target: CommentTarget }) {
  const { session } = useAuth()
  return <CommentThreads key={`${target.kind}:${target.id}:${session?.user.id ?? 'visitor'}`} target={target} />
}
