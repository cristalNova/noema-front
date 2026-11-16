import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { getErrorMessage } from '@/shared/api/apiError'
import { createRelatedPost } from '../api/postsApi'
import type { Post } from '../model/post.types'
import { PostRelationDialog, type RelationKind } from './PostRelationDialog'
import './PostActions.css'

export interface PostCountChange {
  replies?: number
  reposts?: number
}

interface PostActionsProps {
  /** El post de la tarjeta: es al que se responde. */
  post: Post
  /**
   * El post que se republica o se cita. En una tarjeta de repost es el original (no se puede republicar un repost);
   * es null mientras el original carga o si ya no está disponible.
   */
  original: Post | null
  /** Se llama con el post recién creado, para que la página lo muestre sin recargar. */
  onCreated?: (created: Post) => void
  onCountChange: (change: PostCountChange) => void
}

type Notice = { text: string; to?: string; linkLabel?: string }

const iconProps = { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const

function ReplyIcon() {
  return <svg {...iconProps}><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
}

function RepostIcon() {
  return <svg {...iconProps}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>
}

function QuoteIcon() {
  return <svg {...iconProps}><path d="M7 7h4v4c0 3-1.5 5-4 5" /><path d="M15 7h4v4c0 3-1.5 5-4 5" /></svg>
}

/** Responder, repostear y citar. Sin sesión se pide iniciar sesión; sin perfil, crearlo. */
export function PostActions({ post, original, onCreated, onCountChange }: PostActionsProps) {
  const requireAuth = useRequireAuth()
  const { status: profileStatus, profile } = useMyProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<RelationKind | null>(null)
  const [isReposting, setIsReposting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState('')

  // El backend solo deja republicar o citar posts públicos (o los propios).
  const isRestricted = original !== null && original.visibility !== undefined && original.visibility !== 'PUBLIC' && original.ownerId !== profile?.id
  const repostHint = isRestricted ? 'Solo se pueden republicar o citar publicaciones públicas' : original === null ? 'La publicación original no está disponible' : undefined

  function ensureCanWrite(reason: string): boolean {
    if (!requireAuth(reason)) return false
    if (profileStatus !== 'missing') return true
    navigate('/profile/new', { state: { from: location.pathname + location.search } })
    return false
  }

  function open(kind: RelationKind) {
    if (!ensureCanWrite(kind === 'REPLY' ? 'responder a esta publicación' : 'citar esta publicación')) return
    setNotice(null)
    setError('')
    setDialog(kind)
  }

  async function repost() {
    if (!original || isReposting || !ensureCanWrite('republicar esta publicación')) return
    setNotice(null)
    setError('')
    setIsReposting(true)
    try {
      const created = await createRelatedPost({ postType: 'REPOST', parentPostId: original.id })
      if (original.id === post.id) onCountChange({ reposts: 1 })
      onCreated?.(created)
      setNotice({ text: 'Republicaste esta publicación.', to: `/posts/${created.id}`, linkLabel: 'Ver republicación' })
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setIsReposting(false)
    }
  }

  async function submitRelation(kind: RelationKind, content: string): Promise<string | null> {
    const parent = kind === 'REPLY' ? post : original
    if (!parent) return 'La publicación original no está disponible.'
    try {
      const created = await createRelatedPost({ postType: kind, parentPostId: parent.id, content })
      if (parent.id === post.id) onCountChange(kind === 'REPLY' ? { replies: 1 } : { reposts: 1 })
      onCreated?.(created)
      setDialog(null)
      setNotice(kind === 'REPLY'
        ? { text: 'Tu respuesta se publicó.', to: `/posts/${created.id}`, linkLabel: 'Ver respuesta' }
        : { text: 'Tu cita se publicó.', to: `/posts/${created.id}`, linkLabel: 'Ver cita' })
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  return (
    <div className="post-actions">
      <div className="post-actions__buttons" role="group" aria-label="Acciones de la publicación">
        <button type="button" className="post-action" onClick={() => open('REPLY')}>
          <ReplyIcon />Responder
        </button>
        <button type="button" className="post-action" disabled={!original || isRestricted || isReposting} title={repostHint} onClick={() => void repost()}>
          <RepostIcon />{isReposting ? 'Republicando…' : 'Repostear'}
        </button>
        <button type="button" className="post-action" disabled={!original || isRestricted} title={repostHint} onClick={() => open('QUOTE')}>
          <QuoteIcon />Citar
        </button>
      </div>
      <p className="post-actions__notice" role="status">
        {notice && <>{notice.text} {notice.to && <Link to={notice.to}>{notice.linkLabel}</Link>}</>}
      </p>
      {error && <p className="post-actions__error" role="alert">{error}</p>}
      {dialog && (
        <PostRelationDialog
          kind={dialog}
          target={dialog === 'REPLY' ? post : original ?? post}
          onClose={() => setDialog(null)}
          onSubmit={(content) => submitRelation(dialog, content)}
        />
      )}
    </div>
  )
}
