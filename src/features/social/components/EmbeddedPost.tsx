import { Link } from 'react-router-dom'
import type { useRelatedPost } from '../hooks/useRelatedPost'

interface EmbeddedPostProps {
  parentPostId: number
  related: ReturnType<typeof useRelatedPost>
}

/** El post original de un repost o una cita, incrustado en la tarjeta. */
export function EmbeddedPost({ parentPostId, related }: EmbeddedPostProps) {
  const { post, status } = related
  return (
    <section className="embedded-post" aria-label="Publicación original">
      <div className="embedded-post__top">
        <span>Publicación original</span>
        <Link to={`/posts/${parentPostId}`}>Ver original</Link>
      </div>
      {status === 'loading' && <p className="embedded-post__status" role="status">Cargando la publicación original…</p>}
      {status === 'unavailable' && <p className="embedded-post__status">La publicación original ya no está disponible para ti.</p>}
      {post && (
        <>
          <p className="embedded-post__author"><strong>{post.owner.name}</strong>{post.owner.username && <small>@{post.owner.username}</small>}</p>
          <p className="embedded-post__text">{post.content || (post.postType === 'REPOST' ? 'Republicó una publicación.' : 'Publicación sin contenido.')}</p>
        </>
      )}
    </section>
  )
}
