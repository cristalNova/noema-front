import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPlans, type Plan } from '@/features/monetization/api/plansApi'
import { createSubscription } from '@/features/monetization/api/subscriptionsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './AuthorPlansPage.css'

export function AuthorPlansPage() {
  const { authorId } = useParams()
  const id = Number(authorId)
  if (!Number.isSafeInteger(id) || id < 1) {
    return <main className="page-shell"><h1>Autor no encontrado</h1><Link className="back-link" to="/articles">Volver a las lecturas</Link></main>
  }
  return <AuthorPlans key={id} authorId={id} />
}

function AuthorPlans({ authorId }: { authorId: number }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState('')
  const [settledAttempt, setSettledAttempt] = useState(-1)
  const [attempt, setAttempt] = useState(0)
  const [busyPlanId, setBusyPlanId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [subscribeError, setSubscribeError] = useState('')
  const loading = settledAttempt !== attempt

  useEffect(() => {
    listPlans({ authorId }).then((result) => {
      setPlans(result.data.filter((plan) => plan.isActive))
      setError('')
    }).catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setSettledAttempt(attempt))
  }, [authorId, attempt])

  function subscribe(plan: Plan) {
    setBusyPlanId(plan.id)
    setMessage('')
    setSubscribeError('')
    createSubscription({ planId: plan.id, autoRenew: true, paymentMethod: 'CARD' })
      .then(() => setMessage('Suscripción creada. Ya puedes leer los ensayos premium de este autor.'))
      .catch((reason: unknown) => setSubscribeError(getErrorMessage(reason)))
      .finally(() => setBusyPlanId(null))
  }

  return (
    <main className="page-shell author-plans">
      <Link className="back-link" to="/articles">← Todas las lecturas</Link>
      <div className="page-header"><p className="eyebrow">Acceso premium</p><h1>Planes del autor</h1><p>Elige un plan para leer completos sus ensayos premium.</p></div>
      {loading ? <p className="status-message" role="status">Cargando planes…</p> : error ? (
        <div className="status-message status-message--error" role="alert"><p>{error}</p><button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>
      ) : plans.length === 0 ? (
        <p className="status-message" role="status">Este autor aún no tiene planes disponibles.</p>
      ) : (
        <ul className="author-plans__list">{plans.map((plan) => <li key={plan.id} className="author-plans__plan">
          <h2>{plan.name}</h2>
          <p>{plan.price} {plan.currency} / {plan.billingPeriod === 'MONTHLY' ? 'mes' : 'año'}</p>
          <button type="button" className="button button--primary" disabled={busyPlanId !== null} onClick={() => subscribe(plan)}>{busyPlanId === plan.id ? 'Procesando…' : 'Suscribirme'}</button>
        </li>)}</ul>
      )}
      {message && <p className="form-success" role="status">{message}</p>}
      {subscribeError && <p className="status-message status-message--error" role="alert">{subscribeError}</p>}
    </main>
  )
}
