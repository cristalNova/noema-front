import { useCallback, useRef, useState } from 'react'
import { toApiError } from '@/shared/api/apiError'
import { getPayment, type Payment } from '@/features/monetization/api/paymentsApi'
import { getSubscription, type RefundedPayment } from '../api/adminPaymentsApi'
import { describeAdminError } from '../model/adminErrors'

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; payment: Payment; planName: string | null }
  | { status: 'error'; message: string }

function describeSearchError(reason: unknown): string {
  // GET /payments/:id no tiene guard de permisos: un 403 aquí significa "pago de otro perfil".
  if (toApiError(reason).status === 403) {
    return 'El servidor solo permite consultar los pagos de tu propio perfil, así que no se puede mostrar este pago.'
  }
  return describeAdminError(reason)
}

/** El pago no trae su plan: se pide la suscripción, y si no se puede (es de otro perfil), se omite. */
async function findPlanName(subscriptionId: number, signal: AbortSignal): Promise<string | null> {
  try {
    const subscription = await getSubscription(subscriptionId, signal)
    return subscription.plan.name
  } catch {
    return null
  }
}

export function usePaymentSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  const search = useCallback(async (id: number) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setState({ status: 'loading' })
    try {
      const payment = await getPayment(id, current.signal)
      const planName = await findPlanName(payment.subscriptionId, current.signal)
      if (current.signal.aborted) return
      setState({ status: 'found', payment, planName })
    } catch (reason) {
      if (current.signal.aborted) return
      setState({ status: 'error', message: describeSearchError(reason) })
    }
  }, [])

  /** Muestra el pago ya reembolsado que devolvió el servidor, sin volver a buscarlo. */
  const applyRefund = useCallback((refunded: RefundedPayment) => {
    setState((previous) =>
      previous.status === 'found'
        ? { status: 'found', payment: refunded, planName: refunded.subscription?.plan.name ?? previous.planName }
        : previous,
    )
  }, [])

  return { state, search, applyRefund }
}