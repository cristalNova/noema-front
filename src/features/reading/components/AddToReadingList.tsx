import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { getErrorMessage } from '@/shared/api/apiError'
import { addReadingListItem, getReadingList, listMyReadingLists, type ReadingList } from '../api/readingListsApi'
import './AddToReadingList.css'

export function AddToReadingList({ articleId }: { articleId: number }) {
  const requireAuth = useRequireAuth()
  const { status } = useMyProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')

  function show() {
    if (!requireAuth('agregar este ensayo a una lista', location.pathname + location.search)) return
    if (status === 'missing') {
      navigate('/profile/new', { state: { from: location.pathname + location.search } })
      return
    }
    setNotice('')
    setOpen(true)
  }

  return <div className="add-to-list">
    <button className="button button--secondary" type="button" onClick={show}>Agregar a lista</button>
    {notice && <p role="status">{notice}</p>}
    {open && <AddToReadingListDialog articleId={articleId} onClose={() => setOpen(false)} onAdded={(name) => { setNotice(`Ensayo agregado a «${name}».`); setOpen(false) }} />}
  </div>
}

function AddToReadingListDialog({ articleId, onClose, onAdded }: { articleId: number; onClose: () => void; onAdded: (name: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = ref.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    listMyReadingLists(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setLists(result)
      setSelected(result[0] ? String(result[0].id) : '')
      setError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setError(`No se pudieron cargar tus listas. ${getErrorMessage(reason)}`); setLoading(false) }
    })
    return () => controller.abort()
  }, [attempt])

  async function add() {
    const list = lists.find((item) => item.id === Number(selected))
    if (!list || pending) return
    setPending(true)
    setError('')
    try {
      // /mine no incluye items; consultar el detalle impide duplicar sin confiar solo en el 409.
      const detail = await getReadingList(list.id)
      if (detail.items?.some((item) => item.articleId === articleId)) {
        setError('Este ensayo ya está en la lista. No se agregó otra vez.')
        return
      }
      await addReadingListItem(list.id, articleId)
      onAdded(list.name)
    } catch (reason) {
      setError(`No se pudo agregar el ensayo. ${getErrorMessage(reason)}`)
    } finally { setPending(false) }
  }

  return <dialog ref={ref} className="add-to-list__dialog" aria-labelledby="add-to-list-title" aria-busy={loading || pending} onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}>
    <p className="add-to-list__eyebrow">La biblioteca de Noema</p>
    <h2 id="add-to-list-title">Agregar a una lista</h2>
    {loading ? <p role="status">Cargando tus listas…</p> : lists.length ? <>
      <label htmlFor="reading-list-choice">Elige una lista</label>
      <select id="reading-list-choice" value={selected} disabled={pending} onChange={(event) => { setSelected(event.target.value); setError('') }}>
        {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
      </select>
    </> : !error && <p>Aún no tienes listas. <Link to="/app/reading-lists" onClick={onClose}>Crear una lista</Link></p>}
    {error && <p className="add-to-list__error" role="alert">{error} {lists.length === 0 && <button type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button>}</p>}
    <div className="add-to-list__actions">
      <button className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
      {lists.length > 0 && <button className="button button--primary" type="button" disabled={pending || loading} onClick={() => void add()}>{pending ? 'Agregando…' : 'Agregar ensayo'}</button>}
    </div>
  </dialog>
}
