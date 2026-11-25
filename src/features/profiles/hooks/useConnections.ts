import { useCallback, useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '@/shared/api'
import { paginate } from '@/shared/utils/pagination'
import { listFollowers, listFollowing } from '../api/followsApi'
import type { Profile } from '../model/Profile'

export type ConnectionKind = 'followers' | 'following'

export const CONNECTIONS_PAGE_SIZE = 12

interface Settled {
  key: string
  profiles: Profile[]
  error: string
}

/**
 * Caso de uso: seguidores o seguidos de un perfil, paginados en el cliente (el backend entrega
 * la lista completa). La página es estado local: quien lo usa debe remontarlo (key) al cambiar
 * de perfil o pestaña.
 */
export function useConnections(profileId: number, kind: ConnectionKind) {
  const [requestedPage, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${profileId}:${kind}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    const request = kind === 'followers' ? listFollowers : listFollowing
    request(profileId, controller.signal)
      .then((profiles) => {
        if (!controller.signal.aborted) setSettled({ key, profiles, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, profiles: [], error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [profileId, kind, key])

  const current = settled?.key === key ? settled : null
  const page = useMemo(
    () => paginate(current?.profiles ?? [], requestedPage, CONNECTIONS_PAGE_SIZE),
    [current, requestedPage],
  )

  return {
    profiles: page.data,
    total: page.total,
    limit: page.limit,
    page: page.page,
    isLoading: current === null,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  }
}
