import { useEffect, useState } from 'react'
import { getPreferences } from '@/features/profiles/api/preferencesApi'
import { listPublishedArticlesByTag } from '../api/articlesApi'
import { getErrorMessage } from '@/shared/api/apiError'
import type { ArticleSummary } from '../model/article.types'

export function useInterestArticles(enabled: boolean) {
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getPreferences(controller.signal)
      .then(async (preferences) => {
        if (controller.signal.aborted) return
        setTags(preferences)
        if (preferences.length === 0) { setArticles([]); return }
        const results = await Promise.all(preferences.map((tag) => listPublishedArticlesByTag(tag, controller.signal)))
        if (controller.signal.aborted) return
        const unique = new Map<number, ArticleSummary>()
        for (const result of results) for (const article of result.data) unique.set(article.id, article)
        setArticles([...unique.values()].sort((a, b) =>
          new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()).slice(0, 4))
      })
      .then(() => { if (!controller.signal.aborted) setError('') })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(getErrorMessage(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [enabled, attempt])

  return { articles, tags, error, loading, retry: () => { setLoading(true); setAttempt((value) => value + 1) } }
}
