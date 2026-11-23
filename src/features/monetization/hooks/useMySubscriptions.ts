import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  cancelSubscription,
  listAllMySubscriptions,
  renewSubscription,
  type PaymentMethod,
  type Subscription,
} from '../api/subscriptionsApi'

/**
 * Suscripciones del usuario con sus acciones. Cada acción actualiza la fila con lo que
 * devuelve el servidor, sin recargar la lista, y devuelve el mensaje de error o null.
 */
export function useMySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listAllMySubscriptions(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setSubscriptions(data)
        setLoadError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [attempt])

  function replace(updated: Subscription) {
    // Se conserva el plan ya cargado por si la respuesta no trae la relación.
    setSubscriptions((previous) => (previous ?? []).map((item) => (
      item.id === updated.id ? { ...item, ...updated, plan: updated.plan ?? item.plan } : item
    )))
  }

  async function renew(subscription: Subscription, paymentMethod: PaymentMethod): Promise<string | null> {
    setNotice('')
    try {
      const updated = await renewSubscription(subscription.id, paymentMethod)
      replace(updated)
      setNotice(`Renovaste “${subscription.plan.name}”.`)
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  async function cancel(subscription: Subscription): Promise<string | null> {
    setNotice('')
    try {
      const updated = await cancelSubscription(subscription.id)
      replace(updated)
      setNotice(`Cancelaste “${subscription.plan.name}”. No se volverá a cobrar.`)
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  return {
    subscriptions: subscriptions ?? [],
    isLoading: subscriptions === null && !loadError,
    loadError,
    retry: () => {
      setLoadError('')
      setAttempt((value) => value + 1)
    },
    notice,
    renew,
    cancel,
  }
}
