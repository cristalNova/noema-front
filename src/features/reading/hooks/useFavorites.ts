import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/apiError'
import { addFavorite, listFavoriteIds, removeFavorite } from '../api/favoritesApi'

export function useFavorites() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [ids, setIds] = useState<Set<number>>(new Set())
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    listFavoriteIds(controller.signal).then((found) => {
      if (!controller.signal.aborted) { setIds(found); setLoadedFor(userId); setError(''); setReady(true) }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setLoadedFor(userId); setError(getErrorMessage(reason)); setReady(true) }
    })
    return () => controller.abort()
  }, [userId, attempt])

  async function toggle(articleId: number) {
    if (pending.has(articleId)) return
    const wasFavorite = ids.has(articleId)
    setPending((current) => new Set(current).add(articleId))
    setIds((current) => {
      const next = new Set(current)
      if (wasFavorite) next.delete(articleId)
      else next.add(articleId)
      return next
    })
    setError('')
    try {
      if (wasFavorite) await removeFavorite(articleId)
      else await addFavorite(articleId)
    } catch (reason) {
      setIds((current) => {
        const next = new Set(current)
        if (wasFavorite) next.add(articleId)
        else next.delete(articleId)
        return next
      })
      setError(`No se pudo actualizar el favorito. ${getErrorMessage(reason)}`)
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(articleId)
        return next
      })
    }
  }

  const matchesSession = userId !== null && loadedFor === userId
  return { ids: matchesSession ? ids : new Set<number>(), ready: userId === null || (matchesSession && ready), pending: matchesSession ? pending : new Set<number>(), error: matchesSession ? error : '', toggle, retry: () => { setReady(false); setAttempt((value) => value + 1) } }
}
