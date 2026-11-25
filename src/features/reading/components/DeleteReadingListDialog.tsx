import { useEffect, useRef, useState } from 'react'
import './DeleteReadingListDialog.css'

interface Props {
  name: string
  pending: boolean
  onClose: () => void
  onConfirm: () => Promise<string | null>
}

export function DeleteReadingListDialog({ name, pending, onClose, onConfirm }: Props) {
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
    else onClose()
  }

  return <dialog
    ref={dialog}
    className="reading-list-dialog"
    aria-busy={pending}
    aria-labelledby="reading-list-dialog-title"
    aria-describedby="reading-list-dialog-description"
    onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}
  >
    <p className="reading-list-dialog__eyebrow">Mis listas</p>
    <h2 id="reading-list-dialog-title">¿Eliminar lista?</h2>
    <p className="reading-list-dialog__name">{name}</p>
    <p id="reading-list-dialog-description">Esta acción es definitiva y no podrás recuperar la lista.</p>
    {error && <p className="reading-list-dialog__error" role="alert">{error}</p>}
    <div className="reading-list-dialog__actions">
      <button ref={cancel} className="button button--secondary" type="button" disabled={pending} onClick={onClose}>Cancelar</button>
      <button className="button reading-list-dialog__danger" type="button" disabled={pending} onClick={() => void confirm()}>{pending ? 'Eliminando…' : 'Eliminar lista'}</button>
    </div>
  </dialog>
}
