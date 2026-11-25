import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ReturnState } from '@/shared/utils/navigation'
import './AuthPromptDialog.css'

interface AuthPromptDialogProps {
  reason?: string
  returnState: ReturnState
  onClose: () => void
}

export function AuthPromptDialog({ reason, returnState, onClose }: AuthPromptDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="auth-prompt"
      aria-labelledby="auth-prompt-title"
      aria-describedby="auth-prompt-text"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="auth-prompt__body">
        <h2 id="auth-prompt-title">Inicia sesión para continuar</h2>
        <p id="auth-prompt-text">
          Necesitas una cuenta para {reason ?? 'hacer esto'}. Al entrar, volverás a esta misma
          página.
        </p>
        <div className="auth-prompt__actions">
          <Link className="auth-prompt__btn auth-prompt__btn--primary" to="/login" state={returnState}>
            Iniciar sesión
          </Link>
          <Link className="auth-prompt__btn auth-prompt__btn--secondary" to="/register" state={returnState}>
            Crear cuenta
          </Link>
          <button type="button" className="auth-prompt__btn auth-prompt__btn--ghost" onClick={onClose}>
            Ahora no
          </button>
        </div>
      </div>
    </dialog>
  )
}
