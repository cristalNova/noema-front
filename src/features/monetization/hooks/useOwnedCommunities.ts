import { useEffect, useState } from 'react'
import { listMyOwnedCommunities, type OwnedCommunity } from '@/features/communities/api/communitiesApi'
import { getErrorMessage } from '@/shared/api/apiError'

/** Comunidades a las que se les puede asociar un plan. Un fallo no impide crear planes de autor. */
export function useOwnedCommunities() {
  const [communities, setCommunities] = useState<OwnedCommunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listMyOwnedCommunities(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setCommunities(data)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  return {
    communities,
    isLoading,
    error,
    retry: () => {
      setIsLoading(true)
      setError('')
      setAttempt((value) => value + 1)
    },
  }
}
