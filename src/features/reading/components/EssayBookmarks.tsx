import { useEffect, useState, type RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/apiError'
import { createBookmark, listArticleBookmarks, type Bookmark } from '../api/bookmarksApi'
import './EssayBookmarks.css'

interface SelectionData { start: number; end: number; left: number; top: number }

function highlightedContent(content: string, bookmarks: Bookmark[]) {
  const ranges = bookmarks.map((bookmark) => {
    let start = bookmark.startPosition
    let end = bookmark.endPosition
    // Si el autor editó el ensayo, solo se recupera el fragmento si aún existe.
    if (content.slice(start, end) !== bookmark.highlightedText) {
      start = content.indexOf(bookmark.highlightedText)
      end = start + bookmark.highlightedText.length
    }
    return { bookmark, start, end }
  }).filter(({ start, end }) => start >= 0 && end > start && end <= content.length)
  const boundaries = [...new Set([0, content.length, ...ranges.flatMap(({ start, end }) => [start, end])])].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    const covering = ranges.filter((range) => range.start <= start && range.end >= end)
    const segment = content.slice(start, end)
    return covering.length
      ? <mark key={start} data-bookmark-ids={covering.map(({ bookmark }) => bookmark.id).join(' ')} title="Fragmento guardado">{segment}</mark>
      : segment
  })
}

export function EssayBookmarks({ articleId, content, contentRef }: { articleId: number; content: string; contentRef: RefObject<HTMLDivElement | null> }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const bookmarkId = Number(new URLSearchParams(location.search).get('bookmark'))
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [selection, setSelection] = useState<SelectionData | null>(null)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!isAuthenticated)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    listArticleBookmarks(articleId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setBookmarks(result)
      setLoaded(true)
      setError('')
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setLoaded(true); setError(`No se pudieron cargar tus marcadores. ${getErrorMessage(reason)}`) }
    })
    return () => controller.abort()
  }, [articleId, isAuthenticated, attempt])

  useEffect(() => {
    if (!loaded || !Number.isSafeInteger(bookmarkId) || bookmarkId < 1) return
    const frame = requestAnimationFrame(() => {
      const target = contentRef.current?.querySelector(`[data-bookmark-ids~="${bookmarkId}"]`)
      target?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [bookmarkId, bookmarks, contentRef, loaded])

  function captureSelection() {
    const root = contentRef.current
    const selected = window.getSelection()
    if (!root || !selected || selected.isCollapsed || !selected.rangeCount) return
    const range = selected.getRangeAt(0)
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return
    const prefix = range.cloneRange()
    prefix.selectNodeContents(root)
    prefix.setEnd(range.startContainer, range.startOffset)
    const start = prefix.toString().length
    const end = start + range.toString().length
    if (!content.slice(start, end).trim()) return
    const rect = range.getBoundingClientRect()
    setSelection({ start, end, left: Math.max(16, Math.min(rect.left, window.innerWidth - 310)), top: Math.max(16, Math.min(rect.bottom + 10, window.innerHeight - 220)) })
    setEditing(false)
    setNote('')
    setError('')
  }

  async function save() {
    if (!selection || pending) return
    setPending(true)
    setError('')
    try {
      const bookmark = await createBookmark({ articleId, highlightedText: content.slice(selection.start, selection.end), startPosition: selection.start, endPosition: selection.end, ...(note.trim() ? { note: note.trim() } : {}) })
      setBookmarks((current) => [...current, bookmark])
      setSelection(null)
      setEditing(false)
      window.getSelection()?.removeAllRanges()
    } catch (reason) {
      setError(`No se pudo guardar el marcador. ${getErrorMessage(reason)}`)
    } finally { setPending(false) }
  }

  return <>
    {error && !selection && <p className="essay-bookmarks__error" role="alert">{error} <button type="button" onClick={() => { setLoaded(false); setAttempt((value) => value + 1) }}>Reintentar</button></p>}
    <div className="article-reader__content" ref={contentRef} onPointerUp={captureSelection} onKeyUp={captureSelection}>{highlightedContent(content, bookmarks)}</div>
    {selection && <div className="essay-bookmarks__popover" style={{ left: selection.left, top: selection.top }} role="dialog" aria-label="Guardar fragmento" onKeyDown={(event) => { if (event.key === 'Escape') setSelection(null) }}>
      <p>«{content.slice(selection.start, selection.end).trim().slice(0, 90)}{selection.end - selection.start > 90 ? '…' : ''}»</p>
      {!isAuthenticated ? <Link to="/login" state={{ from: location.pathname + location.search }}>Inicia sesión para guardar</Link> : <>
        {!editing ? <button className="button button--primary" type="button" onClick={() => setEditing(true)}>Guardar marcador</button> : <>
          <label htmlFor="bookmark-note">Nota (opcional)</label>
          <textarea id="bookmark-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="¿Por qué te importa esta idea?" />
          <button className="button button--primary" type="button" onClick={() => void save()} disabled={pending}>{pending ? 'Guardando…' : 'Guardar marcador'}</button>
        </>}
      </>}
      <button className="button button--secondary" type="button" onClick={() => setSelection(null)}>Cancelar</button>
      {error && <p role="alert">{error}</p>}
    </div>}
  </>
}
