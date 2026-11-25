import { useEffect, useRef, useState } from 'react'
import './DeleteProfileDialog.css'

interface DeleteProfileDialogProps {
  username: string
  pending: boolean
  onClose: () => void
  /** Devuelve null si se eliminó, o el mensaje de error para mostrar en el diálogo. */
  onConfirm: () => Promise<string | null>
}

/** Lo que el backend borra en cascada junto con el perfil. */
const LOSSES = [
  'Tus ensayos, colecciones y reseñas',
  'Tus publicaciones y comentarios',
  'Tus comunidades y membresías',
  'Tus seguidores, favoritos, listas y progreso de lectura',
  'Tus planes, suscripciones y pagos registrados',
]

export function DeleteProfileDialog({ username, pending, onClose, onConfirm }: DeleteProfileDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  // Exige escribir el nombre de usuario: un clic accidental no basta para una acción irreversible.
  const confirmed = typed.trim().replace(/^@/, '') === username

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
    <dialog
      ref={dialog}
      className="delete-profile"
      aria-busy={pending}
      aria-labelledby="delete-profile-title"
      aria-describedby="delete-profile-warning"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <div className="delete-profile__body">
        <h2 id="delete-profile-title">¿Eliminar tu perfil?</h2>
        <p id="delete-profile-warning" className="delete-profile__warning">
          Esta acción no se puede deshacer.
        </p>
        <p>Se eliminará tu perfil y, junto con él, todo lo que has creado en Noema:</p>
        <ul>
          {LOSSES.map((loss) => (
            <li key={loss}>{loss}</li>
          ))}
        </ul>
        <p>Después cerraremos tu sesión. Tu correo y contraseña seguirán existiendo, pero tu contenido no se podrá recuperar.</p>

        <label className="delete-profile__confirm" htmlFor="delete-profile-confirm">
          Para confirmar, escribe <strong>{username}</strong>
        </label>
        <input
          id="delete-profile-confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
        />

        {error && (
          <p className="delete-profile__error" role="alert">
            {error}
          </p>
        )}
        <div className="delete-profile__actions">
          <button ref={cancel} type="button" className="delete-profile__btn" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="delete-profile__btn delete-profile__btn--danger"
            disabled={!confirmed || pending}
            onClick={() => void confirm()}
          >
            {pending ? 'Eliminando…' : 'Eliminar perfil definitivamente'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
