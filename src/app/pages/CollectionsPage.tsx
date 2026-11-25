import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMyProfile } from '@/features/profiles'
import { listMyArticles } from '@/features/articles/api/articlesApi'
import { listAuthorCollections, type CollectionOption } from '@/features/articles/api/collectionsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './CollectionsPage.css'

const PAGE_SIZE = 8

export function CollectionsPage() {
  const { profile } = useMyProfile()
  const profileId = profile?.id
  const location = useLocation()
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const notice = location.state && typeof location.state === 'object' && 'notice' in location.state
    && typeof location.state.notice === 'string' ? location.state.notice : ''

  useEffect(() => {
    if (!profileId) return
    const controller = new AbortController()
    Promise.all([listAuthorCollections(profileId, controller.signal), listMyArticles(controller.signal)])
      .then(([mine, articles]) => {
        if (controller.signal.aborted) return
        const nextCounts: Record<number, number> = {}
        for (const article of articles) {
          if (article.collectionId != null) nextCounts[article.collectionId] = (nextCounts[article.collectionId] ?? 0) + 1
        }
        setCollections(mine)
        setCounts(nextCounts)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [profileId, attempt])

  const totalPages = Math.max(1, Math.ceil(collections.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = collections.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="page-shell collections-page">
      <header className="collections-page__header">
        <div className="page-header">
          <p className="eyebrow">Noema · Espacio de escritura</p>
          <h1>Mis colecciones</h1>
          <p>Reúne tus ensayos por tema o serie en un solo lugar.</p>
        </div>
        <Link className="button button--primary" to="/app/collections/new">Crear colección</Link>
      </header>
      <section className="collections-page__sheet" aria-labelledby="collections-heading" aria-busy={loading}>
        <div className="collections-page__heading">
          <h2 id="collections-heading">Tus colecciones</h2>
          {!loading && !error && <span>{collections.length} {collections.length === 1 ? 'colección' : 'colecciones'}</span>}
        </div>
        <p className="collections-page__notice" role="status">{notice}</p>
        {loading && <p role="status">Cargando colecciones…</p>}
        {!loading && error && <div role="alert"><p>{error}</p><button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button></div>}
        {!loading && !error && collections.length === 0 && (
          <div className="collections-page__empty">
            <h3>Aún no tienes colecciones.</h3>
            <p>Organiza tus ensayos creando tu primera colección.</p>
            <Link className="button button--primary" to="/app/collections/new">Crear colección</Link>
          </div>
        )}
        {!loading && !error && collections.length > 0 && <>
          <ul className="collections-page__list" aria-label="Mis colecciones">
            {visible.map((collection) => <li key={collection.id} className="collections-page__item">
              <h3><Link to={`/app/collections/${collection.id}`}>{collection.title}</Link></h3>
              <p>{collection.description}</p>
              <div className="collections-page__item-footer">
                <span>{counts[collection.id] ?? 0} {(counts[collection.id] ?? 0) === 1 ? 'ensayo' : 'ensayos'}</span>
                <Link className="button button--secondary" to={`/app/collections/${collection.id}`} aria-label={`Ver los ensayos de “${collection.title}”`}>Ver ensayos</Link>
              </div>
            </li>)}
          </ul>
          <nav className="collections-page__pagination" aria-label="Paginación de colecciones">
            <button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button className="button button--secondary" type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </nav>
        </>}
      </section>
    </main>
  )
}

