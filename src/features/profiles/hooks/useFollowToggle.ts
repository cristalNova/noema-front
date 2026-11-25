import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage, toApiError } from '@/shared/api'
import { followProfile, listFollowing, unfollowProfile } from '../api/followsApi'
import { useMyProfile } from './useMyProfile'

/** Quién mira la lista: define qué botón corresponde en cada fila. */
export type FollowViewer = 'visitor' | 'no-profile' | 'loading' | 'member'

interface Loaded {
  myId: number
  ids: Set<number>
}

/**
 * Estado de "¿yo sigo a esta persona?" para toda una lista con UNA sola consulta
 * (mis seguidos), más el alta/baja con actualización inmediata y reversión si falla.
 */
export function useFollowToggle() {
  const { isAuthenticated } = useAuth()
  const { profile: mine, status } = useMyProfile()
  const myId = status === 'ready' ? (mine?.id ?? null) : null

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set())
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || myId === null) return
    const controller = new AbortController()
    listFollowing(myId, controller.signal)
      .then((profiles) => {
        if (!controller.signal.aborted) setLoaded({ myId, ids: new Set(profiles.map((item) => item.id)) })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [isAuthenticated, myId, attempt])

  // Un conjunto guardado de otro perfil (cambio de sesión) no se usa.
  const ids = loaded?.myId === myId ? loaded.ids : null

  let viewer: FollowViewer = 'loading'
  if (!isAuthenticated) viewer = 'visitor'
  else if (status === 'missing') viewer = 'no-profile'
  else if (ids !== null) viewer = 'member'

  const setFollowing = useCallback(
    (profileId: number, following: boolean) => {
      setLoaded((previous) => {
        if (!previous || previous.myId !== myId) return previous
        const next = new Set(previous.ids)
        if (following) next.add(profileId)
        else next.delete(profileId)
        return { ...previous, ids: next }
      })
    },
    [myId],
  )

  const toggle = useCallback(
    async (profileId: number) => {
      if (ids === null || pending.has(profileId)) return
      const wasFollowing = ids.has(profileId)
      setError('')
      setFollowing(profileId, !wasFollowing)
      setPending((previous) => new Set(previous).add(profileId))
      try {
        if (wasFollowing) await unfollowProfile(profileId)
        else await followProfile(profileId)
      } catch (reason) {
        const { status: httpStatus } = toApiError(reason)
        // 409 "ya sigues" / 404 "no sigues": el servidor ya estaba en el estado pedido.
        const alreadyThere = wasFollowing ? httpStatus === 404 : httpStatus === 409
        if (!alreadyThere) {
          setFollowing(profileId, wasFollowing)
          setError(`No se pudo actualizar el seguimiento. ${getErrorMessage(reason)}`)
        }
      } finally {
        setPending((previous) => {
          const next = new Set(previous)
          next.delete(profileId)
          return next
        })
      }
    },
    [ids, pending, setFollowing],
  )

  return {
    viewer,
    myId,
    isFollowing: (profileId: number) => ids?.has(profileId) ?? false,
    isPending: (profileId: number) => pending.has(profileId),
    toggle,
    error,
    reload: useCallback(() => {
      setError('')
      setAttempt((value) => value + 1)
    }, []),
  }
}
