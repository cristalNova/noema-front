import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PaymentMethod, Subscription } from '../api/subscriptionsApi'
import { BILLING_PERIOD_UNITS, formatPlanPrice, formatSubscriptionEnd, PAYMENT_METHOD_LABELS } from '../model/plans'
import { isEntitled } from '../model/subscriptions'
import './PlanSubscribeDialog.css'

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]

interface DialogShellProps {
  title: string
  busy: boolean
  onClose: () => void
  children: (cancelRef: React.RefObject<HTMLButtonElement | null>) => ReactNode
}

/** Diálogo modal: el foco empieza en la opción que no hace nada, y no se cierra mientras procesa. */
function DialogShell({ title, busy, onClose, children }: DialogShellProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancelRef.current?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="plan-dialog"
      aria-busy={busy}
      aria-labelledby="subscription-dialog-title"
      aria-describedby="subscription-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="subscription-dialog-title">{title}</h2>
      {children(cancelRef)}
    </dialog>
  )
}

function Summary({ subscription }: { subscription: Subscription }) {
  const { plan } = subscription
  return (
    <p className="plan-dialog__summary">
      <strong>{plan.name}</strong>
      <span>{formatPlanPrice(plan.price)} {plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}</span>
    </p>
  )
}

/** Hace la acción una sola vez aunque se pulse dos veces, y conserva el error para reintentar. */
function useSingleSubmit(action: () => Promise<string | null>, onDone: () => void) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    const message = await action()
    pending.current = false
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return { busy, error, submit }
}

interface RenewDialogProps {
  subscription: Subscription
  onClose: () => void
  onRenew: (paymentMethod: PaymentMethod) => Promise<string | null>
}

export function RenewSubscriptionDialog({ subscription, onClose, onRenew }: RenewDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const { busy, error, submit } = useSingleSubmit(() => onRenew(paymentMethod), onClose)
  const unit = BILLING_PERIOD_UNITS[subscription.plan.billingPeriod]
  // El backend extiende desde la fecha de fin si sigue vigente; si venció, desde hoy.
  const from = isEntitled(subscription) ? `desde el ${formatSubscriptionEnd(subscription.endDate)}` : 'desde hoy'

  return (
    <DialogShell title="Renovar suscripción" busy={busy} onClose={onClose}>
      {(cancelRef) => (
        <>
          <Summary subscription={subscription} />
          <p id="subscription-dialog-description">Se cobrará un periodo al confirmar y tu acceso se extenderá un {unit} {from}.</p>
          <label className="plan-dialog__field">
            Medio de pago
            <select value={paymentMethod} disabled={busy} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
            </select>
          </label>
          {error && <p className="plan-dialog__error" role="alert">{error}</p>}
          <div className="plan-dialog__actions">
            <button ref={cancelRef} type="button" className="button button--secondary" disabled={busy} onClick={onClose}>Volver</button>
            <button type="button" className="button button--primary" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Procesando…' : 'Renovar y pagar'}
            </button>
          </div>
        </>
      )}
    </DialogShell>
  )
}

interface CancelDialogProps {
  subscription: Subscription
  onClose: () => void
  onCancel: () => Promise<string | null>
}

export function CancelSubscriptionDialog({ subscription, onClose, onCancel }: CancelDialogProps) {
  const { busy, error, submit } = useSingleSubmit(onCancel, onClose)

  return (
    <DialogShell title="¿Cancelar suscripción?" busy={busy} onClose={onClose}>
      {(cancelRef) => (
        <>
          <Summary subscription={subscription} />
          <p id="subscription-dialog-description">
            No se te volverá a cobrar. Conservarás el acceso hasta el <strong>{formatSubscriptionEnd(subscription.endDate)}</strong>.
          </p>
          {error && <p className="plan-dialog__error" role="alert">{error}</p>}
          <div className="plan-dialog__actions">
            <button ref={cancelRef} type="button" className="button button--secondary" disabled={busy} onClick={onClose}>Mantener suscripción</button>
            <button type="button" className="button plan-dialog__danger" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Cancelando…' : 'Cancelar suscripción'}
            </button>
          </div>
        </>
      )}
    </DialogShell>
  )
}
