import { useEffect, useRef, useState } from 'react'
import './LeaveCommunityDialog.css'

interface LeaveCommunityDialogProps {
  communityName: string
  onClose: () => void
  /** Devuelve null si se salió, o el motivo del servidor para mostrarlo dentro del diálogo. */
  onConfirm: () => Promise<string | null>
}

export function LeaveCommunityDialog({ communityName, onClose, onConfirm }: LeaveCommunityDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setBusy(true)
    setError('')
    const message = await onConfirm()
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="leave-community"
      aria-busy={busy}
      aria-labelledby="leave-community-title"
      aria-describedby="leave-community-text"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="leave-community__body">
        <h2 id="leave-community-title">¿Salir de esta comunidad?</h2>
        <p className="leave-community__name">{communityName}</p>
        <p id="leave-community-text">
          Dejarás de recibir su contenido y de participar en ella. Podrás volver a unirte más adelante.
        </p>
        {error && (
          <p className="leave-community__error" role="alert">
            {error}
          </p>
        )}
        <div className="leave-community__actions">
          <button ref={cancel} type="button" className="leave-community__btn" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="leave-community__btn leave-community__btn--primary"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Saliendo…' : 'Salir de la comunidad'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
