import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { getErrorMessage } from '../../../shared/api/apiError'
import { exploreArticles } from '../api/articlesApi'
import type { ArticleSummary } from '../model/article.types'
import {
  EMPTY_FILTERS, EXPLORE_PAGE_SIZE, countActiveFilters, filtersKey, parseFilters, parsePage, toSearchParams,
  type ExploreFilters,
} from '../model/exploreFilters'

/** Ensayos publicados con filtros combinables. Filtros y página viven en la URL (?tag=&community=&author=&collection=&page=). */
export function useArticleExplorer() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const page = parsePage(searchParams)
  const key = filtersKey(filters)

  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [settledKey, setSettledKey] = useState('')
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${userId ?? 'anonymous'}:${key}:${page}:${attempt}`

  // Cambiar de filtros crea una entrada de historial: "atrás" deshace el último filtro.
  const goTo = useCallback((next: ExploreFilters, nextPage = 1, replace = false) => {
    setSearchParams(toSearchParams(next, nextPage), { replace })
  }, [setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    let redirected = false
    exploreArticles(filters, page, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      const lastPage = Math.max(1, Math.ceil(result.total / EXPLORE_PAGE_SIZE))
      // ?page=99 en una URL compartida: volver a la última página real
      if (page > lastPage) { redirected = true; goTo(filters, lastPage, true); return }
      setArticles(result.data)
      setTotal(result.total)
      setError('')
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(getErrorMessage(reason))
    }).finally(() => {
      if (!controller.signal.aborted && !redirected) setSettledKey(requestKey)
    })
    return () => controller.abort()
  }, [filters, page, requestKey, goTo])

  // Al volver a la pestaña se actualiza el listado (igual que usePublishedArticles)
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  return {
    filters,
    activeCount: countActiveFilters(filters),
    articles, total, page, error,
    totalPages: Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE)),
    isLoading: settledKey !== requestKey,
    /** Cambiar un filtro siempre vuelve a la página 1 */
    setFilters: (patch: Partial<ExploreFilters>) => goTo({ ...filters, ...patch }),
    clearFilters: () => goTo(EMPTY_FILTERS),
    setPage: (next: number) => goTo(filters, next),
    retry: () => setAttempt((value) => value + 1),
  }
}
