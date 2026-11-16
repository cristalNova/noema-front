import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPostReplies } from '../api/postsApi'
import type { Post } from '../model/post.types'
import './ReplyThread.css'

/** Cuántas respuestas se ven bajo el post; el resto se lee en su página. */
export const THREAD_PREVIEW_SIZE = 3

interface ReplyThreadProps {
  postId: number
  /** Respuestas hechas desde la tarjeta que todavía no estarían en lo que devolvió el backend. */
  added: Post[]
  /** Total de respuestas del post (incluidas las recién creadas). */
  total: number
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

/**
 * Las primeras respuestas de un post, justo debajo de él y con sangría, unidas al padre por una línea
 * (como un hilo). Cada respuesta enlaza a su propia página, donde se ve el resto de la conversación.
 */
export function ReplyThread({ postId, added, total }: ReplyThreadProps) {
  const [loaded, setLoaded] = useState<{ postId: number; replies: Post[] } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listPostReplies(postId, { limit: THREAD_PREVIEW_SIZE }, controller.signal)
      .then((page) => setLoaded({ postId, replies: page.data }))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [postId])

  // Un fallo no estorba al post: el hilo simplemente no se muestra y "Abrir" sigue llevando a las respuestas.
  if (failed) return null

  const fetched = loaded && loaded.postId === postId ? loaded.replies : []
  const knownIds = new Set(fetched.map((reply) => reply.id))
  const replies = [...fetched, ...added.filter((reply) => !knownIds.has(reply.id))].slice(0, THREAD_PREVIEW_SIZE + added.length)
  if (replies.length === 0) return null
  const hidden = Math.max(0, total - replies.length)

  return (
    <div className="reply-thread" role="group" aria-label="Respuestas a esta publicación">
      <ul className="reply-thread__list">
        {replies.map((reply) => (
          <li key={reply.id} className="reply-thread__item">
            <span className="reply-thread__avatar" aria-hidden="true">
              {reply.owner.profilePhoto ? <img src={reply.owner.profilePhoto} alt="" /> : initials(reply.owner.name)}
            </span>
            <div className="reply-thread__body">
              <p className="reply-thread__meta">
                <strong>{reply.owner.name}</strong>
                {reply.owner.username && <small>@{reply.owner.username}</small>}
                <time dateTime={reply.createdAt}>{dateFormatter.format(new Date(reply.createdAt))}</time>
              </p>
              <p className="reply-thread__text">{reply.content || 'Publicación sin contenido.'}</p>
              <Link className="reply-thread__open" to={`/posts/${reply.id}`} aria-label={`Abrir la respuesta de ${reply.owner.name}`}>
                Abrir <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <Link className="reply-thread__more" to={`/posts/${postId}`}>
          Ver {hidden === 1 ? 'la otra respuesta' : `las ${hidden} respuestas más`}
        </Link>
      )}
    </div>
  )
}
