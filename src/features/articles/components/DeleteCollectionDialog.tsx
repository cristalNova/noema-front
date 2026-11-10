import { useEffect, useRef, useState } from 'react'
import './ArticleState.css'
import '../../../app/pages/CollectionsPage.css'

interface Props {
  title: string
  /** Ensayos que hoy pertenecen a la colección, y cuántos de ellos están publicados. */
  total: number
  published: number
  pending: boolean
  onClose: () => void
  /** Devuelve null si se eliminó, o el mensaje de error para mostrar en el diálogo. */
  onConfirm: () => Promise<string | null>
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function DeleteCollectionDialog({ title, total, published, pending, onClose, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setError('')
    const message = await onConfirm()
    if (message) setError(message)
  }

  return (
    <dialog ref={dialog} className="article-dialog" aria-busy={pending} aria-labelledby="delete-collection-title" aria-describedby="delete-collection-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}>
      <h2 id="delete-collection-title">¿Eliminar colección?</h2>
      <p className="article-dialog__title">{title}</p>
      <div id="delete-collection-description">
        <p>Esta acción es definitiva. Se eliminará la colección y no podrás recuperarla.</p>
        {total === 0
          ? <p>Esta colección no contiene ensayos.</p>
          : <>
            <p><strong>{total === 1 ? 'Su ensayo no se elimina' : `Sus ${total} ensayos no se eliminan`}.</strong> {total === 1 ? 'Seguirá' : 'Seguirán'} en tu lista de ensayos, solo que sin colección.</p>
            {published > 0 && <p>{plural(published, 'ensayo publicado', 'ensayos publicados')} {published === 1 ? 'seguirá' : 'seguirán'} visible{published === 1 ? '' : 's'} para los lectores, pero ya no {published === 1 ? 'aparecerá' : 'aparecerán'} agrupado{published === 1 ? '' : 's'} en esta colección.</p>}
          </>}
      </div>
      {error && <p className="status-message--error" role="alert">{error}</p>}
      <div className="article-dialog__actions">
        <button ref={cancel} className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button className="button collection-delete-button" type="button" disabled={pending} onClick={() => void confirm()}>{pending ? 'Eliminando…' : 'Eliminar definitivamente'}</button>
      </div>
    </dialog>
  )
}
