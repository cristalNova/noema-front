import { useEffect, useRef, useState } from 'react'
import './DeleteCommunityDialog.css'

interface DeleteCommunityDialogProps {
  communityName: string
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => Promise<boolean>
}

export function DeleteCommunityDialog({ communityName, pending, error, onClose, onConfirm }: DeleteCommunityDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    if (submitted) return
    setSubmitted(true)
    const success = await onConfirm()
    if (!success) setSubmitted(false)
  }

  return (
    <dialog
      ref={dialog}
      className="delete-community"
      aria-busy={pending}
      aria-labelledby="delete-community-title"
      aria-describedby="delete-community-warning"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <div className="delete-community__body">
        <h2 id="delete-community-title">¿Eliminar {communityName}?</h2>
        <p id="delete-community-warning" className="delete-community__warning">
          Esta acción eliminará la comunidad y se perderán su contenido y todas sus membresías. Esta operación no se puede deshacer.
        </p>
        {error && <p className="delete-community__error" role="alert">{error}</p>}
        <div className="delete-community__actions">
          <button ref={cancel} type="button" className="button button--secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={pending || submitted}
            onClick={() => void confirm()}
          >
            {pending ? 'Eliminando…' : 'Eliminar comunidad'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
