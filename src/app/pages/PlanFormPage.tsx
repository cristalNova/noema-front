import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listAllMyPlans, type Plan } from '@/features/monetization/api/plansApi'
import { PlanForm } from '@/features/monetization/components/PlanForm'
import { getErrorMessage } from '@/shared/api/apiError'
import './MyPlansPage.css'

interface Settled {
  attempt: number
  plan: Plan | null
  error: string
}

function Shell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="page-shell plan-form-page">
      <Link className="back-link" to="/app/plans">← Mis planes</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Monetización</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
      <section className="plan-form-page__sheet">{children}</section>
    </main>
  )
}

function useSavedRedirect() {
  const navigate = useNavigate()
  return (notice: string) => navigate('/app/plans', { state: { notice } })
}

function EditPlan({ id }: { id: number }) {
  const redirect = useSavedRedirect()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // Se busca entre los planes propios: GET /plans/:id es público y también devolvería los ajenos.
  useEffect(() => {
    const controller = new AbortController()
    listAllMyPlans(controller.signal)
      .then((plans) => {
        if (!controller.signal.aborted) setSettled({ attempt, plan: plans.find((plan) => plan.id === id) ?? null, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ attempt, plan: null, error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [id, attempt])

  const current = settled?.attempt === attempt ? settled : null

  return (
    <Shell title="Editar plan">
      {current === null && <p className="status-message" role="status">Cargando plan…</p>}
      {current?.error && (
        <div className="status-message status-message--error" role="alert">
          <p>{current.error}</p>
          <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>
        </div>
      )}
      {current && !current.error && !current.plan && (
        <div role="alert">
          <p>No puedes editar este plan: no existe o no eres su autor ni quien es propietario de su comunidad.</p>
          <Link className="button button--secondary" to="/app/plans">Volver a mis planes</Link>
        </div>
      )}
      {current?.plan && <PlanForm plan={current.plan} onSaved={(plan) => redirect(`Se guardaron los cambios de “${plan.name}”.`)} />}
    </Shell>
  )
}

export function NewPlanPage() {
  const redirect = useSavedRedirect()
  return (
    <Shell title="Crear plan" description="Define cuánto cuesta y qué da acceso: tus ensayos premium o una comunidad.">
      <PlanForm onSaved={(plan) => redirect(`Se creó “${plan.name}”.`)} />
    </Shell>
  )
}

export function EditPlanPage() {
  const { id } = useParams()
  const planId = Number(id)
  const isValid = Number.isSafeInteger(planId) && planId > 0
  return <EditPlan key={id} id={isValid ? planId : 0} />
}
