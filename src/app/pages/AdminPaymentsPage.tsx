import { useState, type FormEvent } from 'react'
import type { RefundedPayment } from '@/features/admin/api/adminPaymentsApi'
import { PaymentRefundDialog } from '@/features/admin/components/PaymentRefundDialog'
import { usePaymentSearch } from '@/features/admin/hooks/usePaymentSearch'
import { formatAmount, formatPaidAt, PAYMENT_STATUS_LABELS } from '@/features/monetization/model/payments'
import { PAYMENT_METHOD_LABELS } from '@/features/monetization/model/plans'
import { TextField } from '@/shared/components/TextField'

export function AdminPaymentsPage() {
  const { state, search, applyRefund } = usePaymentSearch()
  const [query, setQuery] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [notice, setNotice] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)

  const isLoading = state.status === 'loading'
  const found = state.status === 'found' ? state : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    const value = query.trim()
    if (!/^\d{1,10}$/.test(value) || Number(value) < 1) {
      setFieldError('Escribe el número del pago (un entero positivo).')
      return
    }
    setFieldError('')
    void search(Number(value))
  }

  function handleRefunded(refunded: RefundedPayment) {
    applyRefund(refunded)
    setNotice(`Pago #${refunded.id} reembolsado. La suscripción asociada terminó.`)
  }

  return (
    <section className="admin-sheet" aria-labelledby="admin-payments-heading" aria-busy={isLoading}>
      <header className="admin-sheet__heading">
        <h2 id="admin-payments-heading">Pagos</h2>
      </header>

      <p className="admin-notice" role="status">{notice}</p>

      <form className="admin-search" noValidate onSubmit={handleSubmit}>
        <TextField
          label="Identificador del pago"
          inputMode="numeric"
          value={query}
          error={fieldError || undefined}
          hint="El número del pago, por ejemplo 15."
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="button button--primary" disabled={isLoading}>
          {isLoading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {state.status === 'error' && (
        <div className="status-message status-message--error" role="alert">
          <p>{state.message}</p>
        </div>
      )}

      {found && (
        <section className="admin-section" aria-labelledby="payment-detail-heading">
          <h3 id="payment-detail-heading">Pago #{found.payment.id}</h3>
          <dl className="admin-facts">
            <div><dt>Monto</dt><dd>{formatAmount(found.payment)}</dd></div>
            <div><dt>Método</dt><dd>{PAYMENT_METHOD_LABELS[found.payment.paymentMethod]}</dd></div>
            <div><dt>Estado</dt><dd>{PAYMENT_STATUS_LABELS[found.payment.status]}</dd></div>
            <div>
              <dt>Suscripción</dt>
              <dd>
                {found.planName
                  ? `${found.planName} (#${found.payment.subscriptionId})`
                  : `Suscripción #${found.payment.subscriptionId}`}
              </dd>
            </div>
            <div><dt>Referencia</dt><dd>{found.payment.externalReference ?? 'Sin referencia'}</dd></div>
            <div><dt>Fecha de pago</dt><dd>{formatPaidAt(found.payment.paidAt, true)}</dd></div>
          </dl>

          <div className="admin-actions">
            <button
              type="button"
              className="button admin-danger"
              disabled={found.payment.status !== 'PAID'}
              onClick={() => setIsRefunding(true)}
            >
              Reembolsar
            </button>
          </div>
          {found.payment.status !== 'PAID' && (
            <p className="admin-hint">
              Solo se pueden reembolsar pagos en estado Pagado. Este pago está{' '}
              {PAYMENT_STATUS_LABELS[found.payment.status].toLowerCase()}.
            </p>
          )}
        </section>
      )}

      {found && isRefunding && (
        <PaymentRefundDialog
          payment={found.payment}
          planName={found.planName}
          onClose={() => setIsRefunding(false)}
          onRefunded={handleRefunded}
        />
      )}
    </section>
  )
}