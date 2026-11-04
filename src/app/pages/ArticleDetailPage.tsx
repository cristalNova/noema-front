import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { getMyArticle, getPublishedArticle } from '@/features/articles/api/articlesApi'
import { ArticleStatusBadge } from '@/features/articles/components/ArticleStatusBadge'
import { ArticleByline } from '@/features/articles/components/ArticleByline'
import { useArticleAttribution } from '@/features/articles/hooks/useArticleAttribution'
import { CommentSection } from '@/features/social/components/CommentSection'
import type { Article } from '@/features/articles/model/article.types'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import './ArticleDetailPage.css'

export function ArticleDetailPage({ owned = false }: { owned?: boolean }) {
  const { id } = useParams()
  const { session } = useAuth()
  const articleId = Number(id)
  if (!Number.isSafeInteger(articleId) || articleId < 1) {
    return <main className="page-shell"><h1>Ensayo no encontrado</h1><Link className="back-link" to="/articles">Volver a las lecturas</Link></main>
  }
  return <ArticleReader key={`${id}:${owned}:${session?.user.id ?? 'visitor'}`} id={articleId} owned={owned} />
}

function ArticleReader({ id, owned }: { id: number; owned: boolean }) {
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [settledAttempt, setSettledAttempt] = useState(-1)
  const [attempt, setAttempt] = useState(0)
  const loading = settledAttempt !== attempt
  const backTo = owned ? '/app/articles' : '/articles'
  const { authorOf, communityOf } = useArticleAttribution(article ? [article] : [])

  useEffect(() => {
    const controller = new AbortController()
    const request = owned ? getMyArticle(id, controller.signal) : getPublishedArticle(id, controller.signal)
    request.then((result) => {
      if (controller.signal.aborted) return
      setArticle(result)
      setError('')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof ApiError && reason.status === 404
        ? 'Este ensayo no está disponible. Puede que se haya archivado o que necesites acceso a su comunidad.'
        : getErrorMessage(reason))
    }).finally(() => {
      if (!controller.signal.aborted) setSettledAttempt(attempt)
    })
    return () => controller.abort()
  }, [id, owned, attempt])

  return (
    <main className="page-shell article-reader">
      <Link className="back-link" to={backTo}>← {owned ? 'Mis ensayos' : 'Todas las lecturas'}</Link>
      {loading ? <p className="status-message" role="status">Cargando ensayo…</p> : error ? (
        <div className="article-reader__paper" role="alert"><h1>No pudimos abrir el ensayo</h1><p>{error}</p><button className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>
      ) : article && (
        <>
        <article className="article-reader__paper">
          <header>
            <div className="article-reader__meta"><ArticleStatusBadge status={article.status} />{article.isPremium && <span className="premium-badge">Premium</span>}{article.publishedAt && <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(article.publishedAt))}</time>}</div>
            <h1>{article.title}</h1>
            {article.description && <p className="article-reader__description">{article.description}</p>}
            <ArticleByline author={authorOf(article)} community={communityOf(article)} />
            {article.articleTags?.length > 0 && <ul className="tag-list" aria-label="Etiquetas">{article.articleTags.map(({ tag }) => <li key={tag}><Link to={`/articles?tag=${encodeURIComponent(tag)}`}>#{tag}</Link></li>)}</ul>}
            {article.collectionId != null && <p className="article-reader__collection">Colección: {article.collection?.title ?? `#${article.collectionId}`}{article.collectionPosition != null && ` · Posición ${article.collectionPosition}`}</p>}
            {owned && <Link className="button button--secondary" to={`/app/articles/${id}/edit`}>Editar ensayo</Link>}
          </header>
          <div className="article-reader__content">{article.content}</div>
          {article.locked && <aside className="article-reader__locked"><strong>Estás leyendo un adelanto premium.</strong><p>El contenido completo está disponible para quienes tienen una suscripción vigente al autor.</p><Link className="button button--primary" to={`/profiles/${article.authorId}/plans?essay=${id}`}>Suscribirme</Link></aside>}
          <footer><Link to={backTo}>Seguir explorando <span aria-hidden="true">↗</span></Link><span>Noema · Un espacio para las ideas</span></footer>
        </article>
        {/* El backend solo expone los comentarios de ensayos publicados. */}
        {article.status === 'PUBLISHED' && <CommentSection target={{ kind: 'article', id }} />}
        </>
      )}
    </main>
  )
}
