import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { toApiError } from '@/shared/api/apiError'
import { getMyProfile } from '@/features/profiles/api/profilesApi'
import { getMyMembership, joinCommunity, leaveCommunity, type MembershipStatus } from '../api/membersApi'
import type { Community } from '../model/community.types'

export type CommunityMembershipState = 'NOT_MEMBER' | MembershipStatus | 'LOADING' | 'ERROR'

interface MembershipResult {
  state: CommunityMembershipState
  errorMessage: string | null
  join: () => Promise<void>
  leave: () => Promise<void>
  retry: () => void
}

function getMembershipError(error: unknown): string {
  const apiError = toApiError(error)
  switch (apiError.status) {
    case 401:
      return 'Tu sesión ya no es válida. Inicia sesión para continuar.'
    case 403:
      return 'No tienes permiso para realizar esta acción en esta comunidad.'
    case 404:
      return 'No se encontró la comunidad o tu perfil no está disponible.'
    case 409:
      return 'Ya existe una membresía o una solicitud para esta comunidad.'
    default:
      return 'No se pudo actualizar tu membresía. Intenta de nuevo.'
  }
}

export function useCommunityMembership(community: Community): MembershipResult {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<CommunityMembershipState>(
    isAuthenticated ? 'LOADING' : 'NOT_MEMBER',
  )
  const [loadedCommunityId, setLoadedCommunityId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const operationInFlight = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const controller = new AbortController()
    let active = true
    getMyProfile()
      .then((profile) => getMyMembership(community.id, profile.id))
      .then((membership) => {
        if (!active) return
        setLoadedCommunityId(community.id)
        setErrorMessage(null)
        setState(membership?.status ?? 'NOT_MEMBER')
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setLoadedCommunityId(community.id)
          setState('ERROR')
          setErrorMessage(getMembershipError(error))
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [community.id, isAuthenticated, retry])

  const join = useCallback(async () => {
    if (!isAuthenticated) {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
      navigate('/login', { state: { from: returnTo } })
      return
    }
    const currentState = loadedCommunityId === community.id ? state : 'LOADING'
    if (operationInFlight.current || currentState === 'ACTIVE' || currentState === 'PENDING' || currentState === 'BANNED') return

    operationInFlight.current = true
    setState('LOADING')
    setErrorMessage(null)
    try {
      const membership = await joinCommunity(community.id)
      setLoadedCommunityId(community.id)
      setState(membership.status)
    } catch (error: unknown) {
      if (toApiError(error).status === 409) {
        try {
          const profile = await getMyProfile()
          const membership = await getMyMembership(community.id, profile.id)
          if (membership) {
            setLoadedCommunityId(community.id)
            setState(membership.status)
            return
          }
        } catch (reconciliationError: unknown) {
          setErrorMessage(`${getMembershipError(error)} ${getMembershipError(reconciliationError)}`)
        }
      }
      setState('ERROR')
      setErrorMessage(getMembershipError(error))
    } finally {
      operationInFlight.current = false
    }
  }, [community.id, isAuthenticated, loadedCommunityId, navigate, state])

  const leave = useCallback(async () => {
    const currentState = loadedCommunityId === community.id ? state : 'LOADING'
    if (!isAuthenticated || operationInFlight.current || currentState !== 'ACTIVE') return

    operationInFlight.current = true
    setState('LOADING')
    setErrorMessage(null)
    try {
      await leaveCommunity(community.id)
      setState('NOT_MEMBER')
    } catch (error: unknown) {
      setState('ERROR')
      setErrorMessage(getMembershipError(error))
    } finally {
      operationInFlight.current = false
    }
  }, [community.id, isAuthenticated, loadedCommunityId, state])

  return {
    state: !isAuthenticated ? 'NOT_MEMBER' : loadedCommunityId !== community.id ? 'LOADING' : state,
    errorMessage: loadedCommunityId === community.id ? errorMessage : null,
    join,
    leave,
    retry: () => {
      setState('LOADING')
      setErrorMessage(null)
      setRetry((value) => value + 1)
    },
  }
}
