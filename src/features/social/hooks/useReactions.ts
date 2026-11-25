import { useEffect, useRef, useState } from 'react'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { getReactionSummary, removeReaction, setReaction } from '../api/reactionsApi'
import { applyReaction, type ReactionSummary, type ReactionTargetType, type ReactionType } from '../model/reactions'

/**
 * Reacciones de un ensayo, post o comentario. `react` actualiza los conteos al instante y envía
 * el cambio en segundo plano, en orden; si el servidor lo rechaza, vuelve a leer el estado real.
 * Quien la usa debe remontarla al cambiar de objetivo o de sesión.
 */
export function useReactions(targetType: ReactionTargetType, targetId: number) {
  const [summary, setSummary] = useState<ReactionSummary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [attempt, setAttempt] = useState(0)
  // El último estado (ya con los cambios optimistas): varias pulsaciones seguidas parten de él, no de un render viejo.
  const latest = useRef<ReactionSummary | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())

  function commit(next: ReactionSummary) {
    latest.current = next
    setSummary(next)
  }

  useEffect(() => {
    const controller = new AbortController()
    getReactionSummary(targetType, targetId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        latest.current = data
        setSummary(data)
        setLoadError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
    return () => controller.abort()
  }, [targetType, targetId, attempt])

  function react(type: ReactionType) {
    const current = latest.current
    if (!current) return
    const next = applyReaction(current, type)
    commit(next)
    setActionError('')
    queue.current = queue.current.then(async () => {
      try {
        if (next.mine) await setReaction(targetType, targetId, next.mine)
        else await removeReaction(targetType, targetId)
      } catch (reason) {
        // Quitar algo que ya no estaba puesto deja el estado como se quería.
        if (!next.mine && toApiError(reason).status === 404) return
        setActionError(getErrorMessage(reason))
        try {
          commit(await getReactionSummary(targetType, targetId))
        } catch {
          // Sin poder releer, se deja lo mostrado: el aviso de error ya informa que no se guardó.
        }
      }
    })
  }

  return {
    summary,
    loadError,
    actionError,
    react,
    retry: () => {
      setLoadError(false)
      setAttempt((value) => value + 1)
    },
  }
}
