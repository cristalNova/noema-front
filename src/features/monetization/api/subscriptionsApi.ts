import { httpClient } from '@/shared/api'
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
