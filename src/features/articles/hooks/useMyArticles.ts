import { useEffect, useRef, useState } from 'react'
import { changeArticleStatus, deleteArticle, listMyArticles } from '../api/articlesApi'
import type { ArticleStatus, ArticleSummary } from '../model/article.types'
import { selectArticles, STATUS_LABELS } from '../model/myArticles'
import { toApiError } from '../../../shared/api/apiError'

function errorMessage(error: unknown) {
  const apiError = toApiError(error)
  return apiError.status === 401 ? 'Inicia sesión para consultar y gestionar tus ensayos.' : apiError.message
}

export function useMyArticles() {
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [status, setStatus] = useState<ArticleStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const pending = useRef(false)
  const [notice, setNotice] = useState('')
  const selection = selectArticles(articles, status, page)

  useEffect(() => {
    const controller = new AbortController()
    listMyArticles(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setArticles(data); setLoadError('') }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(errorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [attempt])

  async function mutate(article: ArticleSummary, nextStatus?: ArticleStatus): Promise<string | null> {
    if (pending.current) return 'Hay otra operación en curso. Intenta de nuevo.'
    pending.current = true
    setPendingId(article.id)
    setNotice('')
    try {
      if (nextStatus) {
        const updated = await changeArticleStatus(article.id, nextStatus)
        setArticles((previous) => previous.map((item) => item.id === article.id ? { ...item, ...updated } : item))
        setNotice(`“${article.title}” ahora está en estado ${STATUS_LABELS[updated.status].toLowerCase()}.`)
      } else {
        await deleteArticle(article.id)
        setArticles((previous) => previous.filter((item) => item.id !== article.id))
        setNotice(`Se eliminó “${article.title}”.`)
      }
      // Mantener válida la página si desapareció su última fila.
      setPage(selection.currentPage)
      return null
    } catch (error) {
      return errorMessage(error)
    } finally {
      pending.current = false
      setPendingId(null)
    }
  }

  return {
    articles, status, ...selection, isLoading, loadError, pendingId, notice, mutate,
    setPage,
    filter: (next: ArticleStatus | 'ALL') => { setStatus(next); setPage(1) },
    retry: () => { setIsLoading(true); setAttempt((value) => value + 1) },
  }
}
