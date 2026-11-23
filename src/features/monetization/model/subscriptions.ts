import type { Subscription } from '../api/subscriptionsApi'

export const SUBSCRIPTION_STATUS_LABELS: Record<Subscription['status'], string> = {
  ACTIVE: 'Activa',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
}

/** Activas y canceladas conservan el acceso hasta la fecha de fin, igual que en el backend. */
export function isEntitled(subscription: Subscription, now = new Date()): boolean {
  return subscription.status !== 'EXPIRED' && new Date(subscription.endDate) > now
}

/** La HU ofrece renovar las activas y las vencidas; un plan retirado ya no admite renovaciones. */
export function canRenew(subscription: Subscription): boolean {
  return subscription.status !== 'CANCELLED' && subscription.plan.isActive
}

/** El backend solo cancela suscripciones activas. */
export function canCancel(subscription: Subscription): boolean {
  return subscription.status === 'ACTIVE'
}
