import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Subscription } from '@/features/monetization/api/subscriptionsApi'
import { CancelSubscriptionDialog, RenewSubscriptionDialog } from '@/features/monetization/components/SubscriptionDialogs'
import { useMySubscriptions } from '@/features/monetization/hooks/useMySubscriptions'
import { BILLING_PERIOD_UNITS, formatPlanPrice, formatSubscriptionEnd } from '@/features/monetization/model/plans'
import { canCancel, canRenew, isEntitled, SUBSCRIPTION_STATUS_LABELS } from '@/features/monetization/model/subscriptions'
import './MySubscriptionsPage.css'

type Action = { type: 'renew' | 'cancel'; subscription: Subscription }

function ownerLink({ plan }: Subscription) {
  if (plan.communityId !== null) return <Link to={`/communities/${plan.communityId}`}>Ver comunidad</Link>
  if (plan.authorId !== null) return <Link to={`/profiles/${plan.authorId}`}>Ver autor</Link>
  return null
}

/** Explica el acceso que da cada estado, que no siempre coincide con su nombre. */
function accessNote(subscription: Subscription) {
  const end = formatSubscriptionEnd(subscription.endDate)
  if (subscription.status === 'CANCELLED') {
    return isEntitled(subscription) ? `No se renovará. Tienes acceso hasta el ${end}.` : `Terminó el ${end}.`
  }
  if (subscription.status === 'EXPIRED') return `Venció el ${end}. Renuévala para recuperar el acceso.`
  return null
}

export function MySubscriptionsPage() {
  const { subscriptions, isLoading, loadError, retry, notice, renew, cancel } = useMySubscriptions()
  const [action, setAction] = useState<Action | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)

  function open(type: Action['type'], subscription: Subscription, button: HTMLButtonElement) {
    trigger.current = button
    setAction({ type, subscription })
  }

  function closeDialog() {
    setAction(null)
    // El botón puede haber desaparecido (al cancelar ya no se ofrece "Cancelar"): el foco va a su fila.
    requestAnimationFrame(() => {
      const button = trigger.current
      if (button?.isConnected) button.focus()
      else document.getElementById(`subscription-${action?.subscription.id}`)?.focus()
    })
  }

  return (
    <main className="page-shell my-subscriptions">
      <header className="page-header">
        <p className="eyebrow">Noema · Monetización</p>
        <h1>Mis suscripciones</h1>
        <p>Lo que pagas, hasta cuándo tienes acceso y qué quieres renovar o cancelar.</p>
      </header>

      <section className="my-subscriptions__sheet" aria-labelledby="my-subscriptions-heading" aria-busy={isLoading}>
        <header className="my-subscriptions__heading">
          <h2 id="my-subscriptions-heading">Tus suscripciones</h2>
          {!isLoading && !loadError && <span>{subscriptions.length} {subscriptions.length === 1 ? 'suscripción' : 'suscripciones'}</span>}
        </header>

        <p className="my-subscriptions__notice" role="status">{notice}</p>

        {isLoading && <p className="status-message" role="status">Cargando tus suscripciones…</p>}
        {loadError && (
          <div className="status-message status-message--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
          </div>
        )}
        {!isLoading && !loadError && subscriptions.length === 0 && (
          <div className="my-subscriptions__empty">
            <h3>Aún no tienes suscripciones.</h3>
            <p>Suscríbete a un autor o a una comunidad premium para leer su contenido completo.</p>
            <Link className="button button--secondary" to="/communities">Explorar comunidades</Link>
          </div>
        )}

        {subscriptions.length > 0 && (
          <ul className="my-subscriptions__list" aria-label="Mis suscripciones">
            {subscriptions.map((subscription) => {
              const { plan } = subscription
              const note = accessNote(subscription)
              return (
                <li key={subscription.id}>
                  <article id={`subscription-${subscription.id}`} tabIndex={-1} className={`subscription subscription--${subscription.status.toLowerCase()}`}>
                    <div className="subscription__info">
                      <div className="subscription__title">
                        <h3>{plan.name}</h3>
                        <span className="subscription__status">{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</span>
                      </div>
                      <p className="subscription__price">
                        <strong>{formatPlanPrice(plan.price)}</strong> {plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}
                        {' · '}{ownerLink(subscription)}
                        {' · '}<Link to={`/app/payments?subscription=${subscription.id}`}>Ver pagos</Link>
                      </p>
                      <dl className="subscription__dates">
                        <div><dt>Inicio</dt><dd><time dateTime={subscription.startDate}>{formatSubscriptionEnd(subscription.startDate)}</time></dd></div>
                        <div><dt>Fin</dt><dd><time dateTime={subscription.endDate}>{formatSubscriptionEnd(subscription.endDate)}</time></dd></div>
                      </dl>
                      {note && <p className="subscription__note">{note}</p>}
                      {subscription.status !== 'CANCELLED' && !plan.isActive && (
                        <p className="subscription__note">El plan fue retirado: ya no se puede renovar.</p>
                      )}
                    </div>
                    {(canRenew(subscription) || canCancel(subscription)) && (
                      <div className="subscription__actions">
                        {canRenew(subscription) && (
                          <button type="button" className="button button--primary" aria-label={`Renovar “${plan.name}”`} onClick={(event) => open('renew', subscription, event.currentTarget)}>
                            Renovar
                          </button>
                        )}
                        {canCancel(subscription) && (
                          <button type="button" className="button button--secondary" aria-label={`Cancelar “${plan.name}”`} onClick={(event) => open('cancel', subscription, event.currentTarget)}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {action?.type === 'renew' && (
        <RenewSubscriptionDialog
          key={`renew-${action.subscription.id}`}
          subscription={action.subscription}
          onClose={closeDialog}
          onRenew={(paymentMethod) => renew(action.subscription, paymentMethod)}
        />
      )}
      {action?.type === 'cancel' && (
        <CancelSubscriptionDialog
          key={`cancel-${action.subscription.id}`}
          subscription={action.subscription}
          onClose={closeDialog}
          onCancel={() => cancel(action.subscription)}
        />
      )}
    </main>
  )
}
