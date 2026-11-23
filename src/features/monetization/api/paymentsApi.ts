import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'
import type { PaymentMethod } from './subscriptionsApi'

// PENDING queda reservado en el backend para pasarelas asíncronas; la simulada responde al instante.
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: number
  subscriptionId: number
  /** Precio del plan al momento del cobro: no cambia si después cambia el plan. */
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  status: PaymentStatus
  /** Referencia de la operación en la pasarela. */
  externalReference: string | null
  /** Solo los pagos aprobados tienen fecha: el backend no guarda cuándo se intentó un cobro fallido. */
  paidAt: string | null
}

export interface PaymentListParams extends PaginationParams {
  subscriptionId?: number
}

/** GET /payments: mis pagos, del más reciente al más antiguo. */
export async function listMyPayments(params: PaymentListParams = {}, signal?: AbortSignal): Promise<Paginated<Payment>> {
  const response = await httpClient.get<Paginated<Payment>>('/payments', {
    params: { ...toPageQuery(params), ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}) },
    signal,
  })
  return response.data
}

/** GET /payments/:id. Responde 403 si el pago es de otra persona y 404 si no existe. */
export async function getPayment(id: number, signal?: AbortSignal): Promise<Payment> {
  const response = await httpClient.get<Payment>(`/payments/${id}`, { signal })
  return response.data
}
