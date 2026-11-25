import { useEffect, useRef, useState } from 'react'
import type { Plan } from '../api/plansApi'
import { BILLING_PERIOD_UNITS, formatPlanPrice } from '../model/plans'
import './PlanSubscribeDialog.css'

interface PlanDeleteDialogProps {
  plan: Plan
  onClose: () => void
  /** Devuelve un mensaje de error, o null si la eliminación terminó bien. */
  onConfirm: () => Promise<string | null>
}

export function PlanDeleteDialog({ plan, onClose, onConfirm }: PlanDeleteDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    setIsDeleting(true)
    setError('')
    const message = await onConfirm()
    setIsDeleting(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <dialog
      ref={dialog}
      className="plan-dialog"
      aria-busy={isDeleting}
      aria-labelledby="plan-delete-title"
      aria-describedby="plan-delete-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!isDeleting) onClose()
      }}
    >
      <h2 id="plan-delete-title">¿Eliminar plan?</h2>
      <p className="plan-dialog__summary">
        <strong>{plan.name}</strong>
        <span>{formatPlanPrice(plan.price)} {plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}</span>
      </p>
      <p id="plan-delete-description">Esta acción es definitiva. Un plan con suscripciones no se puede eliminar.</p>
      {error && <p className="plan-dialog__error" role="alert">{error}</p>}
      <div className="plan-dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" disabled={isDeleting} onClick={onClose}>Cancelar</button>
        <button type="button" className="button plan-dialog__danger" disabled={isDeleting} onClick={() => void confirm()}>
          {isDeleting ? 'Eliminando…' : 'Eliminar definitivamente'}
        </button>
      </div>
    </dialog>
  )
}
