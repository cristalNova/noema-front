import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPayment, type Payment } from '@/features/monetization/api/paymentsApi'
import { listAllMySubscriptions, type Subscription } from '@/features/monetization/api/subscriptionsApi'
import { formatAmount, formatPaidAt, PAYMENT_STATUS_LABELS } from '@/features/monetization/model/payments'
import { BILLING_PERIOD_LABELS, PAYMENT_METHOD_LABELS } from '@/features/monetization/model/plans'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import './PaymentsPage.css'

interface Settled {
  attempt: number
  payment: Payment | null
  subscription: Subscription | null
  error: string
  status: number | null
}

const STATUS_EXPLANATIONS: Record<Payment['status'], string> = {
  PENDING: 'La pasarela aún no confirma este cobro.',
  PAID: 'El cobro se aprobó.',
  FAILED: 'La pasarela rechazó el cobro: no se te cobró y la suscripción no se extendió.',
  REFUNDED: 'Se te devolvió este pago y la suscripción terminó en ese momento.',
}

function PaymentDetail({ id }: { id: number }) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const payment = await getPayment(id, controller.signal)
        // La suscripción solo aporta el nombre del plan: si falla, el detalle se muestra igual.
        const subscriptions = await listAllMySubscriptions(controller.signal).catch(() => [])
        const subscription = subscriptions.find((item) => item.id === payment.subscriptionId) ?? null
        if (!controller.signal.aborted) setSettled({ attempt, payment, subscription, error: '', status: null })
      } catch (reason) {
        if (!controller.signal.aborted) setSettled({ attempt, payment: null, subscription: null, error: getErrorMessage(reason), status: toApiError(reason).status })
      }
    }
    void load()
    return () => controller.abort()
  }, [id, attempt])

  const current = settled?.attempt === attempt ? settled : null
  if (current?.status === 403 || current?.status === 404) return <PaymentUnavailable forbidden={current.status === 403} />

  const payment = current?.payment
  const subscription = current?.subscription ?? null

  return (
    <main className="page-shell payments-page payment-detail">
      <Link className="back-link" to="/app/payments">← Historial de pagos</Link>
      {current === null && <p className="status-message" role="status">Cargando pago…</p>}
      {current?.error && (
        <div className="status-message status-message--error" role="alert">
          <p>{current.error}</p>
          <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>
        </div>
      )}
      {payment && (
        <article className={`payments-sheet payment-detail__card payment--${payment.status.toLowerCase()}`}>
          <header className="payment-detail__header">
            <p className="eyebrow">Pago #{payment.id}</p>
            <h1>{formatAmount(payment)}</h1>
            <span className="payment__status">{PAYMENT_STATUS_LABELS[payment.status]}</span>
            <p className="payment-detail__explanation">{STATUS_EXPLANATIONS[payment.status]}</p>
          </header>
          <dl className="payment-detail__facts">
            <div><dt>Monto</dt><dd>{formatAmount(payment)}</dd></div>
            <div><dt>Moneda</dt><dd>{payment.currency}</dd></div>
            <div><dt>Método de pago</dt><dd>{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</dd></div>
            <div><dt>Fecha de cobro</dt><dd>{payment.paidAt ? <time dateTime={payment.paidAt}>{formatPaidAt(payment.paidAt, true)}</time> : 'Sin cobro'}</dd></div>
            <div>
              <dt>Suscripción</dt>
              <dd>
                {subscription ? `${subscription.plan.name} · ${BILLING_PERIOD_LABELS[subscription.plan.billingPeriod].toLowerCase()}` : `Suscripción #${payment.subscriptionId}`}
                {' · '}<Link to={`/app/payments?subscription=${payment.subscriptionId}`}>Ver sus pagos</Link>
              </dd>
            </div>
            <div><dt>Referencia externa</dt><dd>{payment.externalReference ? <code>{payment.externalReference}</code> : 'Sin referencia'}</dd></div>
          </dl>
        </article>
      )}
    </main>
  )
}

function PaymentUnavailable({ forbidden }: { forbidden: boolean }) {
  return (
    <main className="page-shell payments-page payment-detail">
      <Link className="back-link" to="/app/payments">← Historial de pagos</Link>
      <section className="payments-sheet" role="alert">
        <h1 className="payment-detail__unavailable">{forbidden ? 'No puedes ver este pago' : 'Pago no encontrado'}</h1>
        <p>{forbidden ? 'Este pago pertenece a otra cuenta.' : 'Este pago no existe o ya no está disponible.'}</p>
      </section>
    </main>
  )
}

export function PaymentDetailPage() {
  const { id } = useParams()
  const paymentId = Number(id)
  if (!Number.isSafeInteger(paymentId) || paymentId < 1) return <PaymentUnavailable forbidden={false} />
  return <PaymentDetail key={paymentId} id={paymentId} />
}
