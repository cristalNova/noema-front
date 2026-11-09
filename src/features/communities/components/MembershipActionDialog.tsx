import { useEffect, useRef, useState } from 'react'

export type MembershipAction =
  | 'approve'
  | 'reject'
  | 'promote'
  | 'demote'
  | 'ban'

interface MembershipActionDialogProps {
  action: MembershipAction
  memberName: string
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => Promise<boolean>
}

const ACTION_COPY: Record<MembershipAction, { title: string; description: string; confirm: string }> = {
  approve: {
    title: '¿Aprobar solicitud?',
    description: 'Esta persona pasará a formar parte de los miembros activos.',
    confirm: 'Aprobar',
  },
  reject: {
    title: '¿Rechazar solicitud?',
    description: 'La solicitud se eliminará y la persona podrá volver a solicitar acceso.',
    confirm: 'Rechazar',
  },
  promote: {
    title: '¿Promover a moderador?',
    description: 'Esta persona obtendrá permisos de moderación dentro de la comunidad.',
    confirm: 'Promover',
  },
  demote: {
    title: '¿Quitar rol de moderador?',
    description: 'La persona seguirá siendo miembro activo, pero perderá sus permisos de moderación.',
    confirm: 'Quitar rol',
  },
  ban: {
    title: '¿Vetar a esta persona?',
    description: 'La persona quedará vetada de la comunidad y no podrá volver a unirse.',
    confirm: 'Vetar',
  },
}

export function MembershipActionDialog({
  action,
  memberName,
  pending,
  error,
  onClose,
  onConfirm,
}: MembershipActionDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const copy = ACTION_COPY[action]

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
      className="membership-action-dialog"
      aria-busy={pending}
      aria-labelledby="membership-action-title"
      aria-describedby="membership-action-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <div className="membership-action-dialog__body">
        <h2 id="membership-action-title">{copy.title}</h2>
        <p id="membership-action-description">
          <strong>{memberName}</strong>. {copy.description}
        </p>
        {error && <p className="membership-action-dialog__error" role="alert">{error}</p>}
        <div className="membership-action-dialog__actions">
          <button ref={cancel} type="button" className="button button--secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={action === 'ban' || action === 'reject' ? 'button button--danger' : 'button button--primary'}
            disabled={pending || submitted}
            onClick={() => void confirm()}
          >
            {pending ? 'Procesando…' : copy.confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}
