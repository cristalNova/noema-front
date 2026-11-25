import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Plan } from '@/features/monetization/api/plansApi'
import { PlanDeleteDialog } from '@/features/monetization/components/PlanDeleteDialog'
import { useMyPlans } from '@/features/monetization/hooks/useMyPlans'
import { useOwnedCommunities } from '@/features/monetization/hooks/useOwnedCommunities'
import { BILLING_PERIOD_LABELS, BILLING_PERIOD_UNITS, formatPlanPrice } from '@/features/monetization/model/plans'
import './MyPlansPage.css'

function savedNotice(state: unknown): string {
  return state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string' ? state.notice : ''
}

export function MyPlansPage() {
  const { plans, isLoading, loadError, retry, pendingId, notice, actionError, toggleActive, remove } = useMyPlans()
  const { communities } = useOwnedCommunities()
  const location = useLocation()
  const [toDelete, setToDelete] = useState<Plan | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const message = notice || savedNotice(location.state)

  function ownerLabel(plan: Plan) {
    if (plan.communityId === null) return 'Plan de autor'
    const community = communities.find((item) => item.id === plan.communityId)
    return `Comunidad: ${community?.name ?? `#${plan.communityId}`}`
  }

  function closeDialog() {
    setToDelete(null)
    // Si el plan se eliminó su botón ya no existe: el foco pasa al título de la página.
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else heading.current?.focus()
    })
  }

  return (
    <main className="page-shell my-plans">
      <header className="my-plans__header">
        <div className="page-header">
          <p className="eyebrow">Noema · Monetización</p>
          <h1 ref={heading} tabIndex={-1}>Mis planes</h1>
          <p>Crea los planes con los que tus lectores pueden apoyar tu trabajo y acceder a tu contenido.</p>
        </div>
        <Link className="button button--primary" to="/app/plans/new">Crear plan</Link>
      </header>

      <section className="my-plans__sheet" aria-labelledby="my-plans-heading" aria-busy={isLoading}>
        <header className="my-plans__heading">
          <h2 id="my-plans-heading">Tus planes</h2>
          {!isLoading && !loadError && <span>{plans.length} {plans.length === 1 ? 'plan' : 'planes'}</span>}
        </header>

        <p className="my-plans__notice" role="status">{message}</p>
        {actionError && <p className="my-plans__error" role="alert">{actionError}</p>}

        {isLoading && <p className="status-message" role="status">Cargando tus planes…</p>}
        {loadError && (
          <div className="status-message status-message--error" role="alert">
            <p>{loadError}</p>
            <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
          </div>
        )}
        {!isLoading && !loadError && plans.length === 0 && (
          <div className="my-plans__empty">
            <h3>Todavía no tienes planes.</h3>
            <p>Crea tu primer plan para ofrecer tus ensayos premium o el acceso a tu comunidad.</p>
          </div>
        )}

        {plans.length > 0 && (
          <ul className="my-plans__list" aria-label="Mis planes">
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className={plan.isActive ? 'my-plan' : 'my-plan my-plan--inactive'}>
                  <div className="my-plan__info">
                    <div className="my-plan__title">
                      <h3>{plan.name}</h3>
                      <span className={plan.isActive ? 'my-plan__status my-plan__status--active' : 'my-plan__status'}>{plan.isActive ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <p className="my-plan__price"><strong>{formatPlanPrice(plan.price)}</strong> {plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}</p>
                    <p className="my-plan__meta">{BILLING_PERIOD_LABELS[plan.billingPeriod]} · {ownerLabel(plan)}</p>
                  </div>
                  <div className="my-plan__actions">
                    <Link className="button button--secondary" to={`/app/plans/${plan.id}/edit`} aria-label={`Editar “${plan.name}”`}>Editar</Link>
                    <button type="button" className="button button--secondary" disabled={pendingId !== null} aria-label={`${plan.isActive ? 'Desactivar' : 'Activar'} “${plan.name}”`} onClick={() => void toggleActive(plan)}>
                      {pendingId === plan.id ? 'Procesando…' : plan.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="my-plan__delete"
                      disabled={pendingId !== null}
                      aria-label={`Eliminar “${plan.name}”`}
                      onClick={(event) => {
                        trigger.current = event.currentTarget
                        setToDelete(plan)
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toDelete && (
        <PlanDeleteDialog key={toDelete.id} plan={toDelete} onClose={closeDialog} onConfirm={() => remove(toDelete)} />
      )}
    </main>
  )
}
