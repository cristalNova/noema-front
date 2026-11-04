import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import type { Plan } from '../api/plansApi'
import { createSubscription, type PaymentMethod } from '../api/subscriptionsApi'
import { BILLING_PERIOD_UNITS, formatPlanPrice, PAYMENT_METHOD_LABELS } from '../model/plans'
import './PlanSubscribeDialog.css'

interface PlanSubscribeDialogProps {
  plan: Plan
  onClose: () => void
  onSubscribed: (plan: Plan) => void
}

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]

/** El alta cobra en el momento: nunca se envía sin que el lector vea el importe y lo confirme. */
export function PlanSubscribeDialog({ plan, onClose, onSubscribed }: PlanSubscribeDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => element?.close()
  }, [])

  async function confirm() {
    if (pending.current) return
    pending.current = true
    setIsSubmitting(true)
    setError('')
    try {
      await createSubscription({ planId: plan.id, paymentMethod, autoRenew: false })
      onSubscribed(plan)
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      pending.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="plan-dialog"
      aria-busy={isSubmitting}
      aria-labelledby="plan-dialog-title"
      aria-describedby="plan-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!isSubmitting) onClose()
      }}
    >
      <h2 id="plan-dialog-title">Confirma tu suscripción</h2>
      <p className="plan-dialog__summary">
        <strong>{plan.name}</strong>
        <span>{formatPlanPrice(plan.price)} {plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}</span>
      </p>
      <p id="plan-dialog-description">Se cobrará el primer periodo al confirmar. No se renovará automáticamente.</p>
      <label className="plan-dialog__field">
        Medio de pago
        <select value={paymentMethod} disabled={isSubmitting} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
        </select>
      </label>
      {error && <p className="plan-dialog__error" role="alert">{error}</p>}
      <div className="plan-dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" disabled={isSubmitting} onClick={onClose}>Cancelar</button>
        <button type="button" className="button button--primary" disabled={isSubmitting} onClick={() => void confirm()}>
          {isSubmitting ? 'Procesando…' : 'Confirmar y pagar'}
        </button>
      </div>
    </dialog>
  )
}
