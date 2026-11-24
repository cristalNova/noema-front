import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  /** Pinta el botón de confirmar como acción destructiva. */
  danger?: boolean
  onClose: () => void
  /** Devuelve un mensaje de error, o null si la acción terminó bien. */
  onConfirm: () => Promise<string | null>
}

export function ConfirmDialog({ title, children, confirmLabel, busyLabel, danger = false, onClose, onConfirm }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setIsBusy(true)
    setError('')
    const message = await onConfirm()
    setIsBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="admin-dialog"
      aria-busy={isBusy}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!isBusy) onClose()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
      {error && <p className="admin-dialog__error" role="alert">{error}</p>}
      <div className="admin-dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" disabled={isBusy} onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className={danger ? 'button admin-dialog__danger' : 'button button--primary'}
          disabled={isBusy}
          onClick={() => void confirm()}
        >
          {isBusy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}