import { useEffect, useState } from 'react'
import { useAuth } from '../../auth'
import { listPublishedArticles } from '../api/articlesApi'
import { getErrorMessage } from '../../../shared/api/apiError'
import type { ArticleSummary } from '../model/article.types'

export function usePublishedArticles() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [page, setPage] = useState(1)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [settledKey, setSettledKey] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${userId ?? 'anonymous'}:${page}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    let redirected = false
    listPublishedArticles(page, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      const lastPage = Math.max(1, Math.ceil(result.total / 10))
      if (page > lastPage) { redirected = true; setPage(lastPage); return }
      setArticles(result.data)
      setTotal(result.total)
      setError('')
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(getErrorMessage(reason))
    }).finally(() => {
      if (!controller.signal.aborted && !redirected) setSettledKey(requestKey)
    })
    return () => controller.abort()
  }, [page, requestKey])

  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  return {
    articles, page, total, isLoading: settledKey !== requestKey, error, totalPages: Math.max(1, Math.ceil(total / 10)),
    setPage,
    retry: () => setAttempt((value) => value + 1),
  }
}
