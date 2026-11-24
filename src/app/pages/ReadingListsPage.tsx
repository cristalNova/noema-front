import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createReadingList, deleteReadingList, listMyReadingLists, updateReadingList, type ReadingList, type ReadingListInput, type ReadingListStatus } from '@/features/reading/api/readingListsApi'
import { DeleteReadingListDialog } from '@/features/reading/components/DeleteReadingListDialog'
import { getErrorMessage } from '@/shared/api/apiError'
import './ReadingListsPage.css'

const PAGE_SIZE = 8
const EMPTY_FORM: ReadingListInput = { name: '', status: 'WANT_TO_READ', visibility: 'PRIVATE' }
const statusLabels: Record<ReadingListStatus, string> = {
  WANT_TO_READ: 'Por leer', READING: 'Leyendo', READ: 'Leído', CUSTOM: 'Personalizada',
}

export function ReadingListsPage() {
  const [lists, setLists] = useState<ReadingList[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ReadingListInput>(EMPTY_FORM)
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState<ReadingList | null>(null)
  const pages = Math.max(1, Math.ceil(lists.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)

  useEffect(() => {
    const controller = new AbortController()
    listMyReadingLists(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setLists(result)
      setLoadError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setLoadError(`No se pudieron cargar tus listas. ${getErrorMessage(reason)}`); setLoading(false) }
    })
    return () => controller.abort()
  }, [attempt])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormOpen(true)
    setError('')
    setNotice('')
  }

  function openEdit(list: ReadingList) {
    setForm({ name: list.name, status: list.status, visibility: list.visibility })
    setEditingId(list.id)
    setFormOpen(true)
    setError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const input = { ...form, name: form.name.trim() }
    if (!input.name) { setError('Escribe un nombre para la lista.'); return }
    setPending(true)
    setError('')
    try {
      if (editingId === null) {
        const created = await createReadingList(input)
        setLists((current) => [created, ...current])
        setPage(1)
        setNotice(`Lista «${created.name}» creada.`)
      } else {
        const updated = await updateReadingList(editingId, input)
        setLists((current) => current.map((list) => list.id === editingId ? { ...list, ...updated } : list))
        setNotice(`Lista «${updated.name}» actualizada.`)
      }
      setFormOpen(false)
      setEditingId(null)
    } catch (reason) {
      setError(`No se pudo guardar la lista. ${getErrorMessage(reason)}`)
    } finally { setPending(false) }
  }

  async function remove(list: ReadingList): Promise<string | null> {
    if (pending) return null
    setPending(true)
    setNotice('')
    try {
      await deleteReadingList(list.id)
      const next = lists.filter((item) => item.id !== list.id)
      setLists(next)
      setPage((previous) => Math.min(previous, Math.max(1, Math.ceil(next.length / PAGE_SIZE))))
      if (editingId === list.id) { setEditingId(null); setFormOpen(false) }
      setNotice(`Lista «${list.name}» eliminada.`)
      return null
    } catch (reason) {
      return `No se pudo eliminar la lista. ${getErrorMessage(reason)}`
    } finally { setPending(false) }
  }

  return <main className="page-shell reading-lists-page">
    <header className="reading-lists-page__header"><div className="page-header"><p className="eyebrow">La biblioteca de Noema</p><h1>Mis listas</h1><p>Organiza tus lecturas y elige cuáles pueden ver otras personas.</p></div><button className="button button--primary" type="button" disabled={pending} onClick={openCreate}>Nueva lista</button></header>
    <section className="reading-lists-page__sheet" aria-label="Gestión de listas de lectura" aria-busy={loading}>
      {formOpen && <form className="reading-lists-page__form" onSubmit={(event) => void submit(event)}>
        <h2>{editingId === null ? 'Crear lista' : 'Editar lista'}</h2>
        <div className="reading-lists-page__fields">
          <label>Nombre<input name="name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Por ejemplo: Lecturas de vacaciones" /></label>
          <label>Estado<select name="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ReadingListStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Visibilidad<select name="visibility" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ReadingListInput['visibility'] })}><option value="PRIVATE">Privada</option><option value="PUBLIC">Pública</option></select></label>
        </div>
        <p className="reading-lists-page__hint">Las listas públicas aparecen en tu perfil; las privadas solo las ves tú.</p>
        <div className="reading-lists-page__actions"><button className="button button--primary" type="submit" disabled={pending}>{pending ? 'Guardando…' : editingId === null ? 'Crear lista' : 'Guardar cambios'}</button><button className="button button--secondary" type="button" disabled={pending} onClick={() => { setFormOpen(false); setError('') }}>Cancelar</button></div>
      </form>}
      {notice && <p role="status" className="reading-lists-page__notice">{notice}</p>}
      {error && <p role="alert" className="reading-lists-page__error">{error}</p>}
      {loading && <p role="status">Cargando listas…</p>}
      {!loading && loadError && <div role="alert"><p>{loadError}</p><button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button></div>}
      {!loading && !loadError && !lists.length && <div className="reading-lists-page__empty"><h2>Aún no tienes listas.</h2><p>Crea una para organizar lo que quieres leer, estás leyendo o ya leíste.</p>{!formOpen && <button className="button button--primary" type="button" disabled={pending} onClick={openCreate}>Crear lista</button>}</div>}
      {!loading && !loadError && lists.length > 0 && <><div className="reading-lists-page__summary"><h2>Tus listas</h2><span>{lists.length} {lists.length === 1 ? 'lista' : 'listas'}</span></div><ul className="reading-lists-page__list">{lists.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((list) => <li key={list.id}>
        <div><h3>{list.name}</h3><p>{statusLabels[list.status] ?? list.status} · {list.visibility === 'PUBLIC' ? 'Pública' : 'Privada'} · {list.items?.length ?? 0} {(list.items?.length ?? 0) === 1 ? 'ensayo' : 'ensayos'}</p></div>
        <div className="reading-lists-page__actions"><button className="button button--secondary" type="button" disabled={pending} onClick={() => openEdit(list)} aria-label={`Editar ${list.name}`}>Editar</button><button className="button button--secondary reading-lists-page__delete" type="button" disabled={pending} onClick={() => setDeleting(list)} aria-label={`Eliminar ${list.name}`}>Eliminar</button></div>
      </li>)}</ul><nav className="reading-lists-page__pagination" aria-label="Paginación de listas"><button className="button button--secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage} de {pages}</span><button className="button button--secondary" type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav></>}
    </section>
    <p className="reading-lists-page__footer"><Link to="/articles">Explorar ensayos</Link></p>
    {deleting && <DeleteReadingListDialog name={deleting.name} pending={pending} onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}
  </main>
}
