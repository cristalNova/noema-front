import type { Payment, PaymentStatus } from '../api/paymentsApi'
import type { Subscription } from '../api/subscriptionsApi'
import { formatPlanPrice, formatSubscriptionEnd } from './plans'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' })

export function formatAmount(payment: Payment): string {
  return `${formatPlanPrice(payment.amount)} ${payment.currency}`
}

export function formatPaidAt(paidAt: string | null, withTime = false): string {
  if (!paidAt) return 'Sin cobro'
  return withTime ? dateTimeFormatter.format(new Date(paidAt)) : formatSubscriptionEnd(paidAt)
}

/** El pago no trae su plan: se toma de la suscripción a la que pertenece. */
export function subscriptionLabel(subscriptionId: number, subscriptions: Subscription[]): string {
  const subscription = subscriptions.find((item) => item.id === subscriptionId)
  return subscription ? subscription.plan.name : `Suscripción #${subscriptionId}`
}

/** Para el filtro: el nombre del plan puede repetirse si hubo varias suscripciones al mismo. */
export function subscriptionOptionLabel(subscription: Subscription, all: Subscription[]): string {
  const repeated = all.filter((item) => item.plan.name === subscription.plan.name).length > 1
  return repeated ? `${subscription.plan.name} · desde el ${formatSubscriptionEnd(subscription.startDate)}` : subscription.plan.name
}
