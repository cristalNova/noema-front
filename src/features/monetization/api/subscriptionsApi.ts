import { httpClient } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import type { Plan } from './plansApi'

export type PaymentMethod = 'CARD' | 'PAYPAL' | 'BANK_TRANSFER'

export interface Subscription {
  id: number
  planId: number
  plan: Plan
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  startDate: string
  endDate: string
}

export interface CreateSubscriptionInput {
  planId: number
  autoRenew: boolean
  paymentMethod: PaymentMethod
  paymentToken?: string
}

/** Cobra el primer periodo al instante. Un plan de comunidad concede además la membresía activa. */
export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const response = await httpClient.post<Subscription>('/subscriptions', input)
  return response.data
}

/** Todas las suscripciones del usuario, de la más reciente a la más antigua, con su plan. */
export async function listAllMySubscriptions(signal?: AbortSignal): Promise<Subscription[]> {
  const subscriptions: Subscription[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await httpClient.get<Paginated<Subscription>>('/subscriptions', { params: { page, limit: 100 }, signal })
    subscriptions.push(...data.data)
    if (data.data.length === 0 || page * data.limit >= data.total) return subscriptions
  }
}

/**
 * Cobra otro periodo al instante. Extiende desde la fecha de fin si sigue vigente, o desde
 * hoy si venció. Un pago rechazado responde 402; un plan retirado, 400.
 */
export async function renewSubscription(id: number, paymentMethod: PaymentMethod): Promise<Subscription> {
  const response = await httpClient.post<Subscription>(`/subscriptions/${id}/renew`, { paymentMethod })
  return response.data
}

/** Deja de renovarse; el acceso continúa hasta la fecha de fin. Solo admite suscripciones activas. */
export async function cancelSubscription(id: number): Promise<Subscription> {
  const response = await httpClient.post<Subscription>(`/subscriptions/${id}/cancel`)
  return response.data
}
