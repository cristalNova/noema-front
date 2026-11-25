import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteBookmark, listBookmarks, updateBookmark, type Bookmark } from '@/features/reading/api/bookmarksApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './MyBookmarksPage.css'

const PAGE_SIZE = 10

export function MyBookmarksPage() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Bookmark[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [attempt, setAttempt] = useState(0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    const controller = new AbortController()
    listBookmarks(page, PAGE_SIZE, undefined, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (page > 1 && result.total <= (page - 1) * PAGE_SIZE) { setPage(page - 1); return }
      setItems(result.data)
      setTotal(result.total)
      setError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setError(`No se pudieron cargar tus marcadores. ${getErrorMessage(reason)}`); setLoading(false) }
    })
    return () => controller.abort()
  }, [page, attempt])

  async function saveNote(id: number) {
    if (pending !== null) return
    setPending(id)
    setError('')
    try {
      const updated = await updateBookmark(id, note.trim())
      setItems((current) => current.map((item) => item.id === id ? { ...item, note: updated.note ?? note.trim() } : item))
      setEditing(null)
    } catch (reason) {
      setError(`No se pudo editar la nota. ${getErrorMessage(reason)}`)
    } finally { setPending(null) }
  }

  async function remove(id: number) {
    if (pending !== null || !window.confirm('¿Eliminar este marcador?')) return
    setPending(id)
    setError('')
    try {
      await deleteBookmark(id)
      setEditing(null)
      if (items.length === 1 && page > 1) { setLoading(true); setPage(page - 1) }
      else { setItems((current) => current.filter((item) => item.id !== id)); setTotal((value) => value - 1); setAttempt((value) => value + 1) }
    } catch (reason) {
      setError(`No se pudo eliminar el marcador. ${getErrorMessage(reason)}`)
    } finally { setPending(null) }
  }

  return <main className="page-shell bookmarks-page">
    <header className="page-header"><p className="eyebrow">La biblioteca de Noema</p><h1>Mis marcadores</h1><p>Recupera las ideas que guardaste y tus notas.</p></header>
    <section className="bookmarks-page__sheet" aria-label="Marcadores guardados" aria-busy={loading}>
      {loading && <p role="status">Cargando marcadores…</p>}
      {error && <div role="alert"><p>{error}</p>{!items.length && <button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button>}</div>}
      {!loading && !error && !total && <div><h2>Aún no tienes marcadores.</h2><p>Selecciona un fragmento de un ensayo para guardarlo.</p><Link className="button button--primary" to="/articles">Explorar ensayos</Link></div>}
      {!loading && total > 0 && <><ul className="bookmarks-page__list">{items.map((item) => <li key={item.id}>
        <div className="bookmarks-page__entry">
          <p className="bookmarks-page__origin">{item.article?.title ?? `Ensayo #${item.articleId}`} · {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</p>
          <blockquote>«{item.highlightedText}»</blockquote>
          {editing === item.id ? <div className="bookmarks-page__editor"><label htmlFor={`note-${item.id}`}>Nota</label><textarea id={`note-${item.id}`} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /><div><button className="button button--primary" type="button" disabled={pending !== null} onClick={() => void saveNote(item.id)}>Guardar nota</button><button className="button button--secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button></div></div> : <p className="bookmarks-page__note">{item.note || 'Sin nota'}</p>}
        </div>
        <div className="bookmarks-page__actions"><Link className="button button--secondary" to={`/articles/${item.articleId}?bookmark=${item.id}`}>Abrir fragmento</Link><button className="button button--secondary" type="button" onClick={() => { setEditing(item.id); setNote(item.note ?? '') }}>Editar nota</button><button className="button button--secondary" type="button" disabled={pending !== null} onClick={() => void remove(item.id)}>Eliminar</button></div>
      </li>)}</ul><nav className="bookmarks-page__pagination" aria-label="Paginación de marcadores"><button className="button button--secondary" type="button" disabled={page === 1} onClick={() => { setLoading(true); setPage(page - 1) }}>Anterior</button><span>Página {page} de {totalPages}</span><button className="button button--secondary" type="button" disabled={page >= totalPages} onClick={() => { setLoading(true); setPage(page + 1) }}>Siguiente</button></nav></>}
    </section>
  </main>
}
