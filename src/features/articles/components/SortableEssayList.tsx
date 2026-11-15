import { useLayoutEffect, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../../shared/api/apiError'
import { reorderCollectionEssays } from '../api/collectionsApi'
import type { ArticleSummary } from '../model/article.types'
import { moveItem } from '../model/collectionEssays'
import { ArticleStatusBadge } from './ArticleStatusBadge'
import './SortableEssayList.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
const sameOrder = (a: number[], b: number[]) => a.length === b.length && a.every((id, index) => id === b[index])

interface SortableEssayListProps {
  collectionId: number
  /** Ensayos de la colección ya en el orden que ven los lectores. */
  essays: ArticleSummary[]
}

/**
 * Ensayos de una colección que su autor puede reordenar. Se arrastra desde el asa de tres rayitas
 * (el resto de la fila sigue siendo texto y enlaces normales); con el asa enfocada también se mueve
 * con las flechas del teclado. El orden se guarda solo al soltar; si el servidor lo rechaza, la
 * lista vuelve al último orden guardado.
 */
export function SortableEssayList({ collectionId, essays }: SortableEssayListProps) {
  const [items, setItems] = useState(essays)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const savedOrder = useRef(essays.map((essay) => essay.id)) // orden que ya confirmó el servidor
  const orderBeforeDrag = useRef<number[]>([])
  const dropped = useRef(false)
  const focusId = useRef<number | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Tras mover con el teclado, el foco vuelve al asa de ese ensayo (React reubica los nodos al reordenar).
  useLayoutEffect(() => {
    if (focusId.current === null) return
    listRef.current?.querySelector<HTMLElement>(`[data-drag-handle][data-id="${focusId.current}"]`)?.focus()
    focusId.current = null
  }, [items])

  function arrange(ids: number[]) {
    setItems((previous) => {
      const byId = new Map(previous.map((essay) => [essay.id, essay]))
      return ids.flatMap((id) => byId.get(id) ?? [])
    })
  }

  async function persist(next: ArticleSummary[], movedId: number) {
    const ids = next.map((essay) => essay.id)
    if (sameOrder(ids, savedOrder.current)) return
    setSaving(true)
    setNotice('')
    setSaveError('')
    try {
      await reorderCollectionEssays(collectionId, ids)
      savedOrder.current = ids
      const moved = next.find((essay) => essay.id === movedId)
      setNotice(`Orden guardado. «${moved?.title ?? 'El ensayo'}» ahora es el número ${ids.indexOf(movedId) + 1} de ${ids.length}.`)
    } catch (reason) {
      arrange(savedOrder.current)
      setSaveError(`No se pudo guardar el orden; se restauró el anterior. ${getErrorMessage(reason)}`)
    } finally {
      setSaving(false)
    }
  }

  function moveBy(index: number, delta: -1 | 1) {
    if (saving) return
    const moved = items[index]
    const next = moveItem(items, index, index + delta)
    setItems(next)
    focusId.current = moved.id
    void persist(next, moved.id)
  }

  function onDragStart(event: DragEvent<HTMLElement>, id: number) {
    if (saving) { event.preventDefault(); return }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id)) // Firefox no inicia el arrastre sin datos
    // Aunque se agarra del asa, lo que se ve arrastrar es la fila completa.
    const row = event.currentTarget.closest('li')
    if (row) event.dataTransfer.setDragImage(row, 24, 24)
    orderBeforeDrag.current = items.map((essay) => essay.id)
    dropped.current = false
    setNotice('')
    setSaveError('')
    setDraggingId(id)
  }

  // Al pasar sobre otra fila se intercambian solo cuando el cursor cruza su mitad,
  // para que la lista no vibre entre dos posiciones.
  function onDragOverItem(event: DragEvent<HTMLLIElement>, overId: number) {
    if (draggingId === null) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (overId === draggingId) return
    const box = event.currentTarget.getBoundingClientRect()
    const pastMiddle = event.clientY > box.top + box.height / 2
    setItems((previous) => {
      const from = previous.findIndex((essay) => essay.id === draggingId)
      const over = previous.findIndex((essay) => essay.id === overId)
      if (from < 0 || over < 0) return previous
      if (from < over && !pastMiddle) return previous
      if (from > over && pastMiddle) return previous
      return moveItem(previous, from, over)
    })
  }

  function onDrop(event: DragEvent<HTMLOListElement>) {
    if (draggingId === null) return
    event.preventDefault()
    dropped.current = true
    void persist(items, draggingId)
  }

  // dragend ocurre siempre al terminar; si no hubo drop (Esc o se soltó fuera) se descarta lo previsualizado.
  function onDragEnd() {
    if (!dropped.current) arrange(orderBeforeDrag.current)
    setDraggingId(null)
  }

  return (
    <>
      <ol
        ref={listRef}
        className="collection-essays"
        aria-label="Ensayos en orden"
        aria-busy={saving}
        onDragOver={(event) => { if (draggingId !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
        onDrop={onDrop}
      >
        {items.map((article, index) => (
          <li
            key={article.id}
            className={`collection-essay collection-essay--sortable${article.status === 'PUBLISHED' ? '' : ' collection-essay--hidden'}${draggingId === article.id ? ' collection-essay--dragging' : ''}`}
            onDragOver={(event) => onDragOverItem(event, article.id)}
          >
            <span
              className="collection-essay__grip"
              draggable={!saving}
              onDragStart={(event) => onDragStart(event, article.id)}
              onDragEnd={onDragEnd}
              onKeyDown={(event) => {
                // Alternativa con teclado: sin botones a la vista, el asa se mueve con las flechas.
                const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
                if (delta === 0 || index + delta < 0 || index + delta >= items.length) return
                event.preventDefault()
                moveBy(index, delta)
              }}
              role="button"
              tabIndex={0}
              aria-label={`Mover «${article.title}»: arrástralo o usa las flechas arriba y abajo`}
              title="Arrastra para cambiar el orden"
              data-drag-handle
              data-id={article.id}
            >
              <svg viewBox="0 0 20 14" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false">
                <path d="M2 2h16M2 7h16M2 12h16" />
              </svg>
            </span>
            <span className="collection-essay__position"><span className="collection-sr-only">Posición </span>{index + 1}</span>
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
            <div className="collection-essay__actions">
              <Link className="button button--secondary collection-essay__edit" to={`/app/articles/${article.id}/edit`} aria-label={`Editar “${article.title}”`}>Editar</Link>
            </div>
          </li>
        ))}
      </ol>
      <p className="collection-essay__notice" role="status">{notice}</p>
      {saveError && <p className="collection-essay__error" role="alert">{saveError}</p>}
    </>
  )
}
