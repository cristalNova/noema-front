import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Comment, CommentNode } from '../model/comment.types'
import { wasEdited } from '../model/comments'
import { CommentForm } from './CommentForm'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

// Más allá de este nivel no se indenta más: en un móvil el texto quedaría sin espacio.
const MAX_INDENTED_DEPTH = 3

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

export interface CommentActions {
  myProfileId: number | null
  /** Comprueba que se pueda escribir; si no, dirige a iniciar sesión o a crear el perfil. */
  ensureCanWrite: (reason: string) => boolean
  reply: (content: string, parent: Comment) => Promise<string | null>
  edit: (comment: Comment, content: string) => Promise<string | null>
  requestDelete: (node: CommentNode, trigger: HTMLButtonElement) => void
}

interface CommentItemProps {
  node: CommentNode
  depth?: number
  actions: CommentActions
}

export function CommentItem({ node, depth = 0, actions }: CommentItemProps) {
  const { comment, replies } = node
  const [mode, setMode] = useState<'view' | 'reply' | 'edit'>('view')
  const isMine = actions.myProfileId === comment.authorId
  const name = comment.author?.name ?? 'Usuario'

  return (
    <li className="comment">
      <article className="comment__body">
        <header className="comment__header">
          <Link className="comment__author" to={`/profiles/${comment.authorId}`}>
            {comment.author?.profilePhoto
              ? <img className="comment__avatar" src={comment.author.profilePhoto} alt="" />
              : <span className="comment__avatar" aria-hidden="true">{initials(name)}</span>}
            <strong>{name}</strong>
          </Link>
          <span className="comment__meta">
            <time dateTime={comment.createdAt}>{dateFormatter.format(new Date(comment.createdAt))}</time>
            {wasEdited(comment) && ' · editado'}
          </span>
        </header>

        {mode === 'edit' ? (
          <CommentForm
            label="Edita tu comentario"
            submitLabel="Guardar"
            initialValue={comment.content}
            autoFocus
            onCancel={() => setMode('view')}
            onSubmit={async (content) => {
              const message = content === comment.content ? null : await actions.edit(comment, content)
              if (!message) setMode('view')
              return message
            }}
          />
        ) : (
          <>
            <p className="comment__content">{comment.content}</p>
            <div className="comment__actions">
              <button
                type="button"
                aria-expanded={mode === 'reply'}
                aria-label={`Responder a ${name}`}
                onClick={() => {
                  if (mode === 'reply') setMode('view')
                  else if (actions.ensureCanWrite('responder a este comentario')) setMode('reply')
                }}
              >
                Responder
              </button>
              {isMine && <button type="button" aria-label="Editar mi comentario" onClick={() => setMode('edit')}>Editar</button>}
              {isMine && (
                <button
                  type="button"
                  className="comment__delete"
                  aria-label="Eliminar mi comentario"
                  onClick={(event) => actions.requestDelete(node, event.currentTarget)}
                >
                  Eliminar
                </button>
              )}
            </div>
          </>
        )}
      </article>

      {mode === 'reply' && (
        <div className="comment__reply-form">
          <CommentForm
            label={`Responde a ${name}`}
            submitLabel="Responder"
            autoFocus
            onCancel={() => setMode('view')}
            onSubmit={async (content) => {
              const message = await actions.reply(content, comment)
              if (!message) setMode('view')
              return message
            }}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className={depth < MAX_INDENTED_DEPTH ? 'comment-list comment-list--nested' : 'comment-list'} aria-label={`Respuestas a ${name}`}>
          {replies.map((reply) => <CommentItem key={reply.comment.id} node={reply} depth={depth + 1} actions={actions} />)}
        </ul>
      )}
    </li>
  )
}
