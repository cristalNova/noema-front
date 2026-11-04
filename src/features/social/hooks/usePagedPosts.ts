import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api/apiError'
import type { Paginated } from '@/shared/types/Paginated'
import type { Post } from '../model/post.types'
import { readPage } from '../model/posts'

export type PostPageRequest = (page: number, signal: AbortSignal) => Promise<Paginated<Post>>

interface Settled {
  request: PostPageRequest
  page: number
  attempt: number
  result: Paginated<Post> | null
  error: string
}

/**
 * Carga una página de posts usando `?page=` de la URL. `request` debe ser estable
 * (useCallback o función de módulo): al cambiar, la lista se vuelve a pedir.
 */
export function usePagedPosts(request: PostPageRequest) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  const setPage = useCallback((next: number, options?: { replace?: boolean }) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
      return params
    }, options)
  }, [setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    request(page, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSettled({ request, page, attempt, result, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ request, page, attempt, result: null, error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [request, page, attempt])

  const current = settled?.request === request && settled.page === page && settled.attempt === attempt ? settled : null
  const result = current?.result ?? null
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1
  const isOutOfRange = result !== null && page > lastPage

  // La página pedida dejó de existir (URL antigua o se borró su último post).
  useEffect(() => {
    if (isOutOfRange) setPage(lastPage, { replace: true })
  }, [isOutOfRange, lastPage, setPage])

  return {
    posts: result?.data ?? [],
    total: result?.total ?? 0,
    limit: result?.limit ?? 20,
    page,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  }
}

export type PagedPosts = ReturnType<typeof usePagedPosts>
