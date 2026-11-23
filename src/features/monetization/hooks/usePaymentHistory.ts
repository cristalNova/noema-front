import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api/apiError'
import type { Paginated } from '@/shared/types/Paginated'
import { readPageParam } from '@/shared/utils/pagination'
import { listMyPayments, type Payment } from '../api/paymentsApi'
import { listAllMySubscriptions, type Subscription } from '../api/subscriptionsApi'

const SUBSCRIPTION_PARAM = 'subscription'

interface Settled {
  key: string
  result: Paginated<Payment> | null
  error: string
}

function readSubscriptionParam(params: URLSearchParams): number | undefined {
  const id = Number(params.get(SUBSCRIPTION_PARAM))
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}

/** Historial de pagos con la página y el filtro en la URL (`?page=` y `?subscription=`). */
export function usePaymentHistory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPageParam(searchParams)
  const subscriptionId = readSubscriptionParam(searchParams)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const key = `${page}:${subscriptionId ?? 'all'}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    listMyPayments({ page, subscriptionId }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSettled({ key, result, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, result: null, error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [page, subscriptionId, key])

  // Solo sirven para nombrar los pagos y para el filtro: si fallan, el historial se ve igual.
  useEffect(() => {
    const controller = new AbortController()
    listAllMySubscriptions(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSubscriptions(data)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const setPage = useCallback((next: number, options?: { replace?: boolean }) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
      return params
    }, options)
  }, [setSearchParams])

  /** Un filtro nuevo siempre empieza en la primera página. */
  const filterBySubscription = useCallback((id: number | undefined) => {
    setSearchParams(id ? { [SUBSCRIPTION_PARAM]: String(id) } : {})
  }, [setSearchParams])

  const current = settled?.key === key ? settled : null
  const result = current?.result ?? null
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1
  const isOutOfRange = result !== null && page > lastPage

  useEffect(() => {
    if (isOutOfRange) setPage(lastPage, { replace: true })
  }, [isOutOfRange, lastPage, setPage])

  return {
    payments: result?.data ?? [],
    total: result?.total ?? 0,
    limit: result?.limit ?? 20,
    page,
    subscriptionId,
    subscriptions,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    filterBySubscription,
    retry: () => setAttempt((value) => value + 1),
  }
}
