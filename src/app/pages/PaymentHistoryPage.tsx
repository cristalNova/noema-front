import { Link } from 'react-router-dom'
import { usePaymentHistory } from '@/features/monetization/hooks/usePaymentHistory'
import { formatAmount, formatPaidAt, PAYMENT_STATUS_LABELS, subscriptionLabel, subscriptionOptionLabel } from '@/features/monetization/model/payments'
import { PAYMENT_METHOD_LABELS } from '@/features/monetization/model/plans'
import { Pagination } from '@/shared/components/Pagination'
import './PaymentsPage.css'

export function PaymentHistoryPage() {
  const history = usePaymentHistory()
  const { payments, total, limit, page, subscriptionId, subscriptions, isLoading, error } = history
  const isFiltered = subscriptionId !== undefined
  // Un filtro llegado por URL puede no estar entre las opciones (o estas aún no han cargado).
  const isUnknownFilter = isFiltered && !subscriptions.some((item) => item.id === subscriptionId)

  return (
    <main className="page-shell payments-page">
      <header className="page-header">
        <p className="eyebrow">Noema · Monetización</p>
        <h1>Historial de pagos</h1>
        <p>Todo lo que has pagado por tus suscripciones, con el estado de cada cobro.</p>
      </header>

      <section className="payments-sheet" aria-labelledby="payments-heading" aria-busy={isLoading}>
        <header className="payments-sheet__heading">
          <h2 id="payments-heading">Tus pagos</h2>
          {!isLoading && !error && <span>{total} {total === 1 ? 'pago' : 'pagos'}</span>}
        </header>

        {(subscriptions.length > 0 || isFiltered) && (
          <label className="payments-filter">
            <span>Suscripción</span>
            <select value={subscriptionId ?? ''} onChange={(event) => history.filterBySubscription(Number(event.target.value) || undefined)}>
              <option value="">Todas las suscripciones</option>
              {isUnknownFilter && <option value={subscriptionId}>Suscripción #{subscriptionId}</option>}
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>{subscriptionOptionLabel(subscription, subscriptions)}</option>
              ))}
            </select>
          </label>
        )}

        {isLoading && <p className="status-message" role="status">Cargando tus pagos…</p>}
        {error && (
          <div className="status-message status-message--error" role="alert">
            <p>{error}</p>
            <button type="button" className="button button--secondary" onClick={history.retry}>Reintentar</button>
          </div>
        )}

        {!isLoading && !error && payments.length === 0 && (
          <div className="payments-empty">
            {isFiltered ? (
              <>
                <h3>Esta suscripción no tiene pagos.</h3>
                <button type="button" className="button button--secondary" onClick={() => history.filterBySubscription(undefined)}>Ver todos los pagos</button>
              </>
            ) : (
              <>
                <h3>Aún no has hecho pagos.</h3>
                <p>Los planes están en cada comunidad premium y en el perfil de cada autor.</p>
                <Link className="button button--primary" to="/communities">Ver planes disponibles</Link>
              </>
            )}
          </div>
        )}

        {!isLoading && !error && payments.length > 0 && (
          <>
            <ul className="payments-list" aria-label="Pagos">
              {payments.map((payment) => {
                const plan = subscriptionLabel(payment.subscriptionId, subscriptions)
                return (
                  <li key={payment.id} className={`payment payment--${payment.status.toLowerCase()}`}>
                    <div className="payment__main">
                      <p className="payment__amount">{formatAmount(payment)}</p>
                      <p className="payment__plan">{plan}</p>
                    </div>
                    <dl className="payment__facts">
                      <div><dt>Método</dt><dd>{PAYMENT_METHOD_LABELS[payment.paymentMethod]}</dd></div>
                      <div><dt>Fecha</dt><dd>{payment.paidAt ? <time dateTime={payment.paidAt}>{formatPaidAt(payment.paidAt)}</time> : formatPaidAt(null)}</dd></div>
                    </dl>
                    <span className="payment__status">{PAYMENT_STATUS_LABELS[payment.status]}</span>
                    <Link className="payment__link" to={`/app/payments/${payment.id}`} aria-label={`Ver detalle del pago de ${formatAmount(payment)} por ${plan}`}>
                      Ver detalle <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {total > limit && (
              <Pagination page={page} total={total} limit={limit} label="Paginación del historial de pagos" onPageChange={history.setPage} />
            )}
          </>
        )}
      </section>
    </main>
  )
}
