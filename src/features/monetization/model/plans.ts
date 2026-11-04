import type { BillingPeriod } from '../api/plansApi'
import type { PaymentMethod } from '../api/subscriptionsApi'

export type PlanOwner = { kind: 'community' | 'author'; id: number }

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: 'Facturación mensual',
  YEARLY: 'Facturación anual',
}

export const BILLING_PERIOD_UNITS: Record<BillingPeriod, string> = {
  MONTHLY: 'mes',
  YEARLY: 'año',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Tarjeta',
  PAYPAL: 'PayPal',
  BANK_TRANSFER: 'Transferencia bancaria',
}

const priceFormatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** La moneda se muestra aparte, con su código ISO: "$" no distingue entre USD y COP. */
export function formatPlanPrice(price: number): string {
  return priceFormatter.format(price)
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatSubscriptionEnd(endDate: string): string {
  return dateFormatter.format(new Date(endDate))
}
