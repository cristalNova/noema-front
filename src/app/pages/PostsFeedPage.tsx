import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { listPosts } from '@/features/social/api/postsApi'
import { PostFilters } from '@/features/social/components/PostFilters'
import { PostList } from '@/features/social/components/PostList'
import { PostsTabs } from '@/features/social/components/PostsTabs'
import { usePagedPosts, type PostPageRequest } from '@/features/social/hooks/usePagedPosts'
import { readPostFilters, type PostFilters as Filters } from '@/features/social/model/posts'
import './PostsPage.css'

function PostsFeed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { authorId, communityId } = readPostFilters(searchParams)
  const hasFilters = authorId !== undefined || communityId !== undefined

  const request = useCallback<PostPageRequest>(
    (page, signal) => listPosts({ authorId, communityId, page }, signal),
    [authorId, communityId],
  )
  const list = usePagedPosts(request)

  function changeFilters(next: Filters) {
    // Sin "page": un filtro nuevo siempre empieza en la primera página.
    const params = new URLSearchParams()
    if (next.authorId !== undefined) params.set('authorId', String(next.authorId))
    if (next.communityId !== undefined) params.set('communityId', String(next.communityId))
    setSearchParams(params)
  }

  return (
    <main className="page-shell posts-page">
      <header className="page-header">
        <p className="eyebrow">Noema · Publicaciones</p>
        <h1>Sigue la conversación</h1>
        <p>Lo que se comenta ahora, de quienes leen y escriben en Noema.</p>
      </header>
      <PostsTabs />
      <section className="posts-sheet" aria-labelledby="posts-feed-heading" aria-busy={list.isLoading}>
        <header className="posts-sheet__heading">
          <h2 id="posts-feed-heading">Feed</h2>
          {!list.isLoading && !list.error && <span>{list.total} {list.total === 1 ? 'publicación' : 'publicaciones'}</span>}
        </header>
        <PostFilters filters={{ authorId, communityId }} onChange={changeFilters} />
        <PostList
          list={list}
          label="Feed de publicaciones"
          loadingMessage="Cargando publicaciones…"
          empty={hasFilters ? (
            <>
              <h3>Nada por aquí con estos filtros.</h3>
              <p>No hay publicaciones visibles para ti. Algunas solo están disponibles para seguidores o miembros de una comunidad.</p>
              <button type="button" className="button button--secondary" onClick={() => changeFilters({})}>Quitar filtros</button>
            </>
          ) : (
            <>
              <h3>La conversación está por empezar.</h3>
              <p>Todavía no hay publicaciones visibles para ti.</p>
            </>
          )}
        />
      </section>
    </main>
  )
}

/** Se remonta al cambiar la sesión: lo que el feed puede mostrar depende de quién lo consulta. */
export function PostsFeedPage() {
  const { session } = useAuth()
  return <PostsFeed key={session?.user.id ?? 'visitor'} />
}
