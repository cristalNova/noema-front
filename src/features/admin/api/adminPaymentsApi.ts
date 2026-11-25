import { httpClient } from '@/shared/api'
import type { Payment } from '@/features/monetization/api/paymentsApi'
import type { Subscription } from '@/features/monetization/api/subscriptionsApi'

/** El reembolso responde con el pago ya actualizado y su suscripción (con el plan). */
export interface RefundedPayment extends Payment {
  subscription?: Subscription
}

/** POST /payments/:id/refund (requiere manage_payments). 404 si no existe; 409 si no está PAID. */
export async function refundPayment(id: number): Promise<RefundedPayment> {
  const response = await httpClient.post<RefundedPayment>(`/payments/${id}/refund`)
  return response.data
}

/** GET /subscriptions/:id. Solo responde para suscripciones del propio perfil (403 si no). */
export async function getSubscription(id: number, signal?: AbortSignal): Promise<Subscription> {
  const response = await httpClient.get<Subscription>(`/subscriptions/${id}`, { signal })
  return response.data
}