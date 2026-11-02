import { useCallback, useEffect, useState } from 'react'
import { listCommunities } from '../api/communitiesApi'
import type { Community } from '../model/community.types'

export function useCommunities(search: string) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ data: Community[]; total: number; page: number; limit: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [retry, setRetry] = useState(0)

  const retryRequest = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(true)
    setRetry((value) => value + 1)
  }, [])

  const changePage = useCallback((nextPage: number) => {
    setResult(null)
    setError(null)
    setIsLoading(true)
    setPage(nextPage)
  }, [])

  const resetPage = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(true)
    setPage(1)
  }, [])

  useEffect(() => {
    let active = true

    listCommunities({ page, search })
      .then((response) => {
        if (active) setResult(response)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, retry, search])

  return {
    communities: result?.data ?? [],
    total: result?.total ?? 0,
    currentPage: result?.page ?? page,
    limit: result?.limit ?? 20,
    isLoading,
    error,
    page,
    setPage: changePage,
    resetPage,
    retryRequest,
  }
}
