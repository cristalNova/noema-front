import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAuth, useRequireAuth } from '@/features/auth'
import type { Plan } from '@/features/monetization/api/plansApi'
import { PlanCard } from '@/features/monetization/components/PlanCard'
import { PlanSubscribeDialog } from '@/features/monetization/components/PlanSubscribeDialog'
import { usePlanCatalog } from '@/features/monetization/hooks/usePlanCatalog'
import type { PlanOwner } from '@/features/monetization/model/plans'
import { useMyProfile } from '@/features/profiles'
import './PlansPage.css'

const PLAN_PARAM = 'plan'

function ownerPath({ kind, id }: PlanOwner) {
  return kind === 'community' ? `/communities/${id}` : `/profiles/${id}`
}

function PlansUnavailable({ kind }: { kind: PlanOwner['kind'] }) {
  return (
    <main className="page-shell plans-page">
      <section className="plans-sheet">
        <h1 className="plans-page__unavailable">{kind === 'community' ? 'Comunidad no encontrada' : 'Autor no encontrado'}</h1>
        <p>{kind === 'community' ? 'Esta comunidad no existe o ya no está disponible.' : 'Este perfil no existe o ya no está disponible.'}</p>
        <Link className="button button--secondary" to={kind === 'community' ? '/communities' : '/articles'}>
          {kind === 'community' ? 'Ver comunidades' : 'Ver ensayos'}
        </Link>
      </section>
    </main>
  )
}

function PlansCatalog({ owner }: { owner: PlanOwner }) {
  const { isAuthenticated } = useAuth()
  const { status: profileStatus } = useMyProfile()
  const { ownerName, plans, error, isUnavailable, isLoading, retry } = usePlanCatalog(owner)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const requireAuth = useRequireAuth()
  const [subscribedPlan, setSubscribedPlan] = useState<Plan | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const backTo = ownerPath(owner)

  // El plan elegido vive en la URL: así, tras iniciar sesión, el lector vuelve a la confirmación.
  const selectedId = Number(searchParams.get(PLAN_PARAM))
  const selectedPlan = isAuthenticated ? plans.find((plan) => plan.id === selectedId) : undefined

  function subscribe(plan: Plan) {
    setSubscribedPlan(null)
    const params = new URLSearchParams(searchParams)
    params.set(PLAN_PARAM, String(plan.id))
    if (isAuthenticated) setSearchParams(params)
    else requireAuth('suscribirte a este plan', `${location.pathname}?${params}`)
  }

  function closeDialog() {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      params.delete(PLAN_PARAM)
      return params
    }, { replace: true })
    requestAnimationFrame(() => heading.current?.focus())
  }

  // Suscribirse exige un perfil; al crearlo, el lector regresa a este mismo plan.
  if (selectedPlan && profileStatus === 'missing') {
    return <Navigate to="/profile/new" replace state={{ from: location.pathname + location.search }} />
  }
  if (isUnavailable) return <PlansUnavailable kind={owner.kind} />

  return (
    <main className="page-shell plans-page">
      <Link className="back-link" to={backTo}>← {owner.kind === 'community' ? 'Volver a la comunidad' : 'Volver al perfil'}</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Planes</p>
        <h1 ref={heading} tabIndex={-1}>{ownerName ? `Planes de ${ownerName}` : 'Planes'}</h1>
        <p>{owner.kind === 'community' ? 'Elige cómo quieres acceder a esta comunidad.' : 'Elige cómo quieres leer los ensayos premium de este autor.'}</p>
      </header>

      <section className="plans-sheet" aria-labelledby="plans-heading" aria-busy={isLoading}>
        <h2 id="plans-heading">Planes disponibles</h2>
        {subscribedPlan && (
          <p className="plans-page__notice" role="status">
            Te suscribiste a <strong>{subscribedPlan.name}</strong>.{' '}
            {owner.kind === 'community' ? 'Ya tienes acceso a la comunidad.' : 'Ya puedes leer sus ensayos premium.'}{' '}
            <Link to={backTo}>{owner.kind === 'community' ? 'Ir a la comunidad' : 'Ir al perfil'}</Link>
          </p>
        )}
        {isLoading && <p className="status-message" role="status">Cargando planes…</p>}
        {error && (
          <div className="status-message status-message--error" role="alert">
            <p>{error}</p>
            <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
          </div>
        )}
        {!isLoading && !error && plans.length === 0 && (
          <div className="plans-page__empty">
            <h3>Todavía no hay planes disponibles.</h3>
            <p>{owner.kind === 'community' ? 'Esta comunidad no tiene planes activos por ahora.' : 'Este autor no tiene planes activos por ahora.'}</p>
          </div>
        )}
        {plans.length > 0 && (
          <ul className="plan-grid" aria-label="Planes de pago">
            {plans.map((plan) => <li key={plan.id}><PlanCard plan={plan} onSubscribe={subscribe} /></li>)}
          </ul>
        )}
      </section>

      {selectedPlan && (
        <PlanSubscribeDialog
          key={selectedPlan.id}
          plan={selectedPlan}
          onClose={closeDialog}
          onSubscribed={(plan) => {
            setSubscribedPlan(plan)
            closeDialog()
          }}
        />
      )}
    </main>
  )
}

/** Se remonta al cambiar de titular o de sesión para no arrastrar datos ni avisos del anterior. */
export function PlansPage({ kind }: { kind: PlanOwner['kind'] }) {
  const { id } = useParams()
  const { session } = useAuth()
  const ownerId = Number(id)
  if (!Number.isSafeInteger(ownerId) || ownerId < 1) return <PlansUnavailable kind={kind} />
  return <PlansCatalog key={`${kind}:${ownerId}:${session?.user.id ?? 'visitor'}`} owner={{ kind, id: ownerId }} />
}
