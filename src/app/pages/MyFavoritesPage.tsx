import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFavorites, removeFavorite, type Favorite } from '@/features/reading/api/favoritesApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './MyFavoritesPage.css'

export function MyFavoritesPage() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Favorite[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const totalPages = Math.max(1, Math.ceil(total / 10))

  useEffect(() => {
    const controller = new AbortController()
    listFavorites(page, 10, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      // Al quitar el último favorito de una página, se vuelve a la anterior.
      if (page > 1 && result.total <= (page - 1) * 10) { setPage(page - 1); return }
      setItems(result.data)
      setTotal(result.total)
      setError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setError(getErrorMessage(reason)); setLoading(false) }
    })
    return () => controller.abort()
  }, [page, attempt])

  async function remove(id: number) {
    setPending(id)
    setError('')
    try {
      await removeFavorite(id)
      setItems((current) => current.filter((item) => item.articleId !== id))
      setTotal((value) => value - 1)
      setAttempt((value) => value + 1)
    } catch (reason) {
      setError(`No se pudo quitar el favorito. ${getErrorMessage(reason)}`)
    } finally { setPending(null) }
  }

  return <main className="page-shell favorites-page">
    <header className="page-header"><p className="eyebrow">La biblioteca de Noema</p><h1>Mis favoritos</h1><p>Vuelve a los ensayos que guardaste.</p></header>
    <section className="favorites-page__sheet" aria-label="Mis ensayos favoritos" aria-busy={loading}>
      {loading && <p role="status">Cargando favoritos…</p>}
      {error && <div role="alert"><p>{error}</p><button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button></div>}
      {!loading && !error && total === 0 && <div><h2>Aún no tienes favoritos.</h2><p>Encuentra un ensayo que te guste y guárdalo aquí.</p><Link className="button button--primary" to="/articles">Explorar ensayos</Link></div>}
      {!loading && total > 0 && <><ul className="favorites-page__list">
        {items.map((item) => <li key={item.articleId}><div><h2><Link to={`/articles/${item.articleId}`}>{item.article?.title ?? `Ensayo #${item.articleId}`}</Link></h2><p>{item.article?.description}</p><small>Guardado el {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</small></div><button type="button" className="button button--secondary" disabled={pending === item.articleId} onClick={() => remove(item.articleId)}>Quitar de favoritos</button></li>)}
      </ul><nav className="favorites-page__pagination" aria-label="Paginación de favoritos"><button type="button" className="button button--secondary" disabled={page <= 1} onClick={() => { setLoading(true); setPage(page - 1) }}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" className="button button--secondary" disabled={page >= totalPages} onClick={() => { setLoading(true); setPage(page + 1) }}>Siguiente</button></nav></>}
    </section>
  </main>
}
