import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMyProfile } from '@/features/profiles'
import { listMyArticles } from '@/features/articles/api/articlesApi'
import { deleteCollection, getCollection, type CollectionOption } from '@/features/articles/api/collectionsApi'
import { DeleteCollectionDialog } from '@/features/articles/components/DeleteCollectionDialog'
import { SortableEssayList } from '@/features/articles/components/SortableEssayList'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import { orderCollectionEssays } from '@/features/articles/model/collectionEssays'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import './CollectionsPage.css'

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

  const ordered = useMemo(() => orderCollectionEssays(articles, collectionId), [articles, collectionId])
  const total = ordered.length
  const published = ordered.filter((article) => article.status === 'PUBLISHED').length

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
            <p>Elige esta colección al escribir o editar un ensayo: se añadirá al final.</p>
            <Link className="button button--primary" to="/app/articles/new">Escribir un ensayo</Link>
          </div>
        ) : <>
          <p className="collection-detail__legend">Agarra un ensayo de las tres rayitas (≡) y arrástralo para cambiar su lugar. El orden se guarda al soltar. Los lectores solo ven los ensayos publicados, en este mismo orden; los borradores y archivados quedan marcados.</p>
          {/* key: si se recargan los ensayos, la lista parte de nuevo del orden del servidor. */}
          <SortableEssayList key={ordered.map((article) => article.id).join(',')} collectionId={collectionId} essays={ordered} />
        </>}
      </section>
    </main>
  )
}
