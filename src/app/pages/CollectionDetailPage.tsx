import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMyProfile } from '@/features/profiles'
import { listMyArticles } from '@/features/articles/api/articlesApi'
import { deleteCollection, getCollection, type CollectionOption } from '@/features/articles/api/collectionsApi'
import { ArticleStatusBadge } from '@/features/articles/components/ArticleStatusBadge'
import { DeleteCollectionDialog } from '@/features/articles/components/DeleteCollectionDialog'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import { orderCollectionEssays } from '@/features/articles/model/collectionEssays'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import './CollectionsPage.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export function CollectionDetailPage() {
  const { id } = useParams()
  const collectionId = Number(id)
  if (!Number.isSafeInteger(collectionId) || collectionId < 1) {
    return <main className="page-shell collection-detail"><Link className="back-link" to="/app/collections">← Mis colecciones</Link><p role="alert">La colección solicitada no es válida.</p></main>
  }
  return <CollectionDetail key={collectionId} collectionId={collectionId} />
}

function CollectionDetail({ collectionId }: { collectionId: number }) {
  const { profile } = useMyProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const notice = location.state && typeof location.state === 'object' && 'notice' in location.state
    && typeof location.state.notice === 'string' ? location.state.notice : ''
  const [collection, setCollection] = useState<CollectionOption | null>(null)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [settledAttempt, setSettledAttempt] = useState(-1)
  const loading = settledAttempt !== attempt

  useEffect(() => {
    const controller = new AbortController()
    // GET /articles/mine incluye borradores y archivados, no solo lo que ven los lectores.
    Promise.all([getCollection(collectionId, controller.signal), listMyArticles(controller.signal)]).then(([found, mine]) => {
      if (controller.signal.aborted) return
      setCollection(found)
      setArticles(mine)
      setError(null)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason)
    }).finally(() => {
      if (!controller.signal.aborted) setSettledAttempt(attempt)
    })
    return () => controller.abort()
  }, [collectionId, attempt])

  const { positioned, unpositioned } = useMemo(() => orderCollectionEssays(articles, collectionId), [articles, collectionId])
  const total = positioned.length + unpositioned.length
  const published = [...positioned, ...unpositioned].filter((article) => article.status === 'PUBLISHED').length

  const back = <Link className="back-link" to="/app/collections">← Mis colecciones</Link>
  if (loading) return <main className="page-shell collection-detail">{back}<p role="status" className="status-message">Cargando colección…</p></main>
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="page-shell collection-detail">{back}
        <div role="alert" className="status-message status-message--error">
          <p>{notFound ? 'Esta colección no existe o ya no está disponible.' : getErrorMessage(error)}</p>
          {!notFound && <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}
        </div>
      </main>
    )
  }
  if (!collection) return null
  // Las colecciones son públicas, pero solo su autora o autor ve aquí sus borradores y el orden completo.
  if (profile?.id !== collection.authorId) {
    return (
      <main className="page-shell collection-detail">{back}
        <header className="page-header"><p className="eyebrow">Noema · Espacio de escritura</p><h1>Esta colección no es tuya</h1><p role="alert">Solo su autor puede ver aquí sus ensayos y su orden.</p></header>
      </main>
    )
  }

  async function confirmDelete(): Promise<string | null> {
    setPendingDelete(true)
    try {
      await deleteCollection(collectionId)
    } catch (reason) {
      // Si ya no existía, el resultado buscado (que no esté) se cumple: se vuelve al listado igual.
      if (!(reason instanceof ApiError && reason.status === 404)) {
        setPendingDelete(false)
        return getErrorMessage(reason)
      }
    }
    navigate('/app/collections', { replace: true, state: { notice: `Se eliminó “${collection?.title}”.` } })
    return null
  }

  return (
    <main className="page-shell collection-detail">
      {back}
      {notice && <p className="collection-detail__notice" role="status">{notice}</p>}
      <header className="collections-page__header">
        <div className="page-header">
          <p className="eyebrow">Noema · Colección</p>
          <h1>{collection.title}</h1>
          {collection.description && <p className="collection-detail__description">{collection.description}</p>}
        </div>
        <div className="collection-detail__actions">
          <Link className="button button--secondary" to={`/app/collections/${collectionId}/edit`}>Editar colección</Link>
          <button type="button" className="button collection-delete-link" onClick={() => setDeleting(true)}>Eliminar colección</button>
        </div>
      </header>
      {deleting && <DeleteCollectionDialog title={collection.title} total={total} published={published} pending={pendingDelete} onClose={() => setDeleting(false)} onConfirm={confirmDelete} />}
      <section className="collections-page__sheet" aria-labelledby="collection-essays-heading">
        <div className="collections-page__heading">
          <h2 id="collection-essays-heading">Ensayos de la colección</h2>
          <span>{total} {total === 1 ? 'ensayo' : 'ensayos'}{total > 0 && ` · ${published} ${published === 1 ? 'publicado' : 'publicados'}`}</span>
        </div>
        {total === 0 ? (
          <div className="collections-page__empty">
            <h3>Esta colección aún no tiene ensayos.</h3>
            <p>Elige esta colección al escribir o editar un ensayo y define en qué posición va.</p>
            <Link className="button button--primary" to="/app/articles/new">Escribir un ensayo</Link>
          </div>
        ) : <>
          <p className="collection-detail__legend">Este es el orden de la colección. Los lectores solo ven los ensayos publicados, en este mismo orden; los borradores y archivados quedan marcados.</p>
          {positioned.length > 0 && <EssayList label="Ensayos en orden" articles={positioned} />}
          {unpositioned.length > 0 && <>
            <h3 className="collection-detail__subheading">Sin posición asignada</h3>
            <p className="collection-detail__legend">Van al final, por antigüedad. Edita el ensayo para darles un lugar.</p>
            <EssayList label="Ensayos sin posición" articles={unpositioned} />
          </>}
        </>}
      </section>
    </main>
  )
}

function EssayList({ label, articles }: { label: string; articles: ArticleSummary[] }) {
  return (
    <ol className="collection-essays" aria-label={label}>
      {articles.map((article) => (
        <li key={article.id} className={`collection-essay${article.status === 'PUBLISHED' ? '' : ' collection-essay--hidden'}`}>
          <span className={`collection-essay__position${article.collectionPosition == null ? ' collection-essay__position--none' : ''}`}>
            {article.collectionPosition == null ? <span aria-label="Sin posición">–</span> : <><span className="collection-sr-only">Posición </span>{article.collectionPosition}</>}
          </span>
          <div className="collection-essay__body">
            <h4><Link to={`/app/articles/${article.id}`}>{article.title}</Link></h4>
            {article.description && <p>{article.description}</p>}
            <div className="collection-essay__meta">
              <ArticleStatusBadge status={article.status} />
              {article.isPremium && <span className="premium-badge">Premium</span>}
              <time dateTime={article.updatedAt}>Actualizado {dateFormatter.format(new Date(article.updatedAt))}</time>
              {article.status !== 'PUBLISHED' && <span className="collection-essay__note">Los lectores aún no lo ven</span>}
            </div>
          </div>
          <Link className="button button--secondary collection-essay__edit" to={`/app/articles/${article.id}/edit`} aria-label={`Editar “${article.title}”`}>Editar</Link>
        </li>
      ))}
    </ol>
  )
}
