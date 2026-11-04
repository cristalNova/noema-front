import { useCallback } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { listPostReplies } from '@/features/social/api/postsApi'
import { PostCard } from '@/features/social/components/PostCard'
import { PostList } from '@/features/social/components/PostList'
import { usePagedPosts, type PostPageRequest } from '@/features/social/hooks/usePagedPosts'
import { usePost } from '@/features/social/hooks/usePost'
import './PostsPage.css'

function BackLink() {
  return <Link className="back-link" to="/posts">← Volver al feed</Link>
}

function PostUnavailable() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  return (
    <main className="page-shell posts-page post-detail">
      <BackLink />
      <section className="post-detail__unavailable">
        <h1>Esta publicación no está disponible</h1>
        <p>Puede que se haya eliminado o que sea solo para seguidores o miembros de una comunidad.</p>
        <div className="post-detail__actions">
          <Link className="button button--secondary" to="/posts">Ir al feed</Link>
          {!isAuthenticated && <Link className="button button--primary" to="/login" state={{ from: location.pathname }}>Iniciar sesión</Link>}
        </div>
      </section>
    </main>
  )
}

function Replies({ postId }: { postId: number }) {
  const request = useCallback<PostPageRequest>((page, signal) => listPostReplies(postId, { page }, signal), [postId])
  const list = usePagedPosts(request)

  return (
    <section className="posts-sheet" aria-labelledby="post-replies-heading" aria-busy={list.isLoading}>
      <header className="posts-sheet__heading">
        <h2 id="post-replies-heading">Respuestas</h2>
        {!list.isLoading && !list.error && <span>{list.total} {list.total === 1 ? 'respuesta' : 'respuestas'}</span>}
      </header>
      <PostList
        list={list}
        label="Respuestas de la publicación"
        loadingMessage="Cargando respuestas…"
        empty={<p>Todavía no hay respuestas visibles para ti.</p>}
      />
    </section>
  )
}

function PostDetail({ id }: { id: number }) {
  const { post, error, isUnavailable, isLoading, retry } = usePost(id)

  if (isUnavailable) return <PostUnavailable />

  return (
    <main className="page-shell posts-page post-detail">
      <BackLink />
      {isLoading && <p className="status-message" role="status">Cargando publicación…</p>}
      {error && (
        <div className="status-message status-message--error" role="alert">
          <p>{error}</p>
          <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
        </div>
      )}
      {post && (
        <>
          <h1 className="post-detail__title">Publicación de {post.owner.name}</h1>
          <div className="post-detail__main"><PostCard post={post} linkToDetail={false} /></div>
          <Replies postId={post.id} />
        </>
      )}
    </main>
  )
}

/** Se remonta al cambiar de post o de sesión: la visibilidad depende de quién consulta. */
export function PostDetailPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const postId = Number(id)
  if (!Number.isSafeInteger(postId) || postId < 1) return <PostUnavailable />
  return <PostDetail key={`${postId}:${session?.user.id ?? 'visitor'}`} id={postId} />
}
