import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReadingList, removeReadingListItem, reorderReadingListItems, type ReadingList, type ReadingListItem } from '@/features/reading/api/readingListsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './ReadingListDetailPage.css'

const orderItems = (items: ReadingListItem[]) => [...items].sort((a, b) => a.orderIndex - b.orderIndex)
const move = (items: ReadingListItem[], from: number, to: number) => {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

export function ReadingListDetailPage() {
  const id = Number(useParams().id)
  const [list, setList] = useState<ReadingList | null>(null)
  const [items, setItems] = useState<ReadingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [dragging, setDragging] = useState<number | null>(null)
  const focusId = useRef<number | null>(null)
  const rowList = useRef<HTMLOListElement>(null)
  const busy = useRef(false)

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id <= 0) return
    const controller = new AbortController()
    getReadingList(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setList(result)
      setItems(orderItems(result.items ?? []))
      setError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setError(`No se pudo abrir la lista. ${getErrorMessage(reason)}`); setLoading(false) }
    })
    return () => controller.abort()
  }, [id, attempt])

  useLayoutEffect(() => {
    if (focusId.current === null) return
    rowList.current?.querySelector<HTMLElement>(`[data-list-handle="${focusId.current}"]`)?.focus()
    focusId.current = null
  }, [items])

  async function reorder(from: number, to: number) {
    if (busy.current || from === to || from < 0 || to < 0 || to >= items.length) return
    const before = items
    const next = move(before, from, to)
    busy.current = true
    setPending(true)
    setItems(next)
    setError('')
    setNotice('')
    focusId.current = before[from].articleId
    try {
      await reorderReadingListItems(id, next.map((item) => item.articleId))
      setNotice('Orden guardado.')
    } catch (reason) {
      setItems(before)
      setError(`No se pudo guardar el orden; se restauró el anterior. ${getErrorMessage(reason)}`)
    } finally { busy.current = false; setPending(false); setDragging(null) }
  }

  async function remove(item: ReadingListItem) {
    if (busy.current) return
    const before = items
    busy.current = true
    setPending(true)
    setItems(before.filter((entry) => entry.articleId !== item.articleId))
    setError('')
    setNotice('')
    try {
      await removeReadingListItem(id, item.articleId)
      setNotice(`«${item.article?.title ?? 'Ensayo'}» quitado de la lista.`)
    } catch (reason) {
      setItems(before)
      setError(`No se pudo quitar el ensayo; se restauró la lista. ${getErrorMessage(reason)}`)
    } finally { busy.current = false; setPending(false) }
  }

  function startDrag(event: DragEvent<HTMLElement>, articleId: number) {
    if (busy.current) { event.preventDefault(); return }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(articleId))
    setDragging(articleId)
  }

  function drop(event: DragEvent<HTMLLIElement>, targetId: number) {
    event.preventDefault()
    const sourceId = Number(event.dataTransfer.getData('text/plain'))
    if (sourceId !== dragging) return
    const from = items.findIndex((item) => item.articleId === sourceId)
    const to = items.findIndex((item) => item.articleId === targetId)
    void reorder(from, to)
  }

  if (!Number.isSafeInteger(id) || id <= 0) return <main className="page-shell reading-list-detail"><Link className="back-link" to="/app/reading-lists">← Mis listas</Link><div className="reading-list-detail__sheet" role="alert"><h1>Lista no encontrada</h1></div></main>

  return <main className="page-shell reading-list-detail">
    <Link className="back-link" to="/app/reading-lists">← Mis listas</Link>
    <section className="reading-list-detail__sheet" aria-busy={loading || pending}>
      {loading ? <p role="status">Cargando lista…</p> : !list ? <div role="alert"><h1>Lista no disponible</h1><p>{error}</p><button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button></div> : <>
        <header><p className="eyebrow">Mi lista de lectura</p><h1>{list.name}</h1><p>{list.visibility === 'PUBLIC' ? 'Pública' : 'Privada'} · {items.length} {items.length === 1 ? 'ensayo' : 'ensayos'}</p></header>
        {notice && <p role="status" className="reading-list-detail__notice">{notice}</p>}
        {error && <p role="alert" className="reading-list-detail__error">{error}</p>}
        {items.length ? <><p className="reading-list-detail__hint">Arrastra los ensayos para ordenarlos. También puedes usar las flechas del teclado sobre el control de orden.</p>
          <ol ref={rowList} aria-label="Ensayos de la lista" className="reading-list-detail__items">
            {items.map((item, index) => <li key={item.articleId} className={dragging === item.articleId ? 'is-dragging' : ''} onDragOver={(event) => { if (dragging !== null) event.preventDefault() }} onDrop={(event) => drop(event, item.articleId)}>
              <span className="reading-list-detail__handle" role="button" tabIndex={pending ? -1 : 0} draggable={!pending} data-list-handle={item.articleId} aria-label={`Mover «${item.article?.title ?? `Ensayo ${item.articleId}`}»: arrastra o usa las flechas`} title="Arrastra para cambiar el orden" onDragStart={(event) => startDrag(event, item.articleId)} onDragEnd={() => setDragging(null)} onKeyDown={(event) => {
                const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
                if (!delta || index + delta < 0 || index + delta >= items.length) return
                event.preventDefault()
                void reorder(index, index + delta)
              }}>☰</span>
              <span className="reading-list-detail__number">{index + 1}</span>
              <div className="reading-list-detail__content"><h2><Link to={`/articles/${item.articleId}`}>{item.article?.title ?? `Ensayo #${item.articleId}`}</Link></h2>{item.article?.description && <p>{item.article.description}</p>}</div>
              <button className="button button--secondary reading-list-detail__remove" type="button" disabled={pending} onClick={() => void remove(item)} aria-label={`Quitar ${item.article?.title ?? `ensayo ${item.articleId}`} de la lista`}>Quitar</button>
            </li>)}
          </ol></> : <div className="reading-list-detail__empty"><h2>Esta lista aún no tiene ensayos.</h2><p>Explora la biblioteca y usa “Agregar a lista” en una lectura.</p><Link className="button button--primary" to="/articles">Explorar ensayos</Link></div>}
      </>}
    </section>
  </main>
}
