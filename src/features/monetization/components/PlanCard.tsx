import type { Plan } from '../api/plansApi'
import { BILLING_PERIOD_LABELS, BILLING_PERIOD_UNITS, formatPlanPrice } from '../model/plans'
import './PlanCard.css'

interface PlanCardProps {
  plan: Plan
  onSubscribe: (plan: Plan) => void
}

export function PlanCard({ plan, onSubscribe }: PlanCardProps) {
  return (
    <article className="plan-card">
      <h3>{plan.name}</h3>
      <p className="plan-card__price">
        <strong>{formatPlanPrice(plan.price)}</strong>
        <span>{plan.currency} / {BILLING_PERIOD_UNITS[plan.billingPeriod]}</span>
      </p>
      <p className="plan-card__period">{BILLING_PERIOD_LABELS[plan.billingPeriod]}</p>
      <button type="button" className="button button--primary plan-card__subscribe" aria-label={`Suscribirme a ${plan.name}`} onClick={() => onSubscribe(plan)}>
        Suscribirme
      </button>
    </article>
  )
}
