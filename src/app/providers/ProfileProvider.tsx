import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import {
  ProfileContext,
  initialProfileState,
  profileReducer,
  profilesApi,
  type Profile,
  type ProfileContextValue,
} from '@/features/profiles'
import { toApiError } from '@/shared/api/apiError'

/** Carga el perfil del usuario autenticado y lo comparte; se reinicia al cambiar la sesión. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [state, dispatch] = useReducer(profileReducer, initialProfileState)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) {
      dispatch({ type: 'reset' })
      return
    }

    let cancelled = false
    dispatch({ type: 'loading' })
    profilesApi
      .getMine()
      .then((profile) => {
        if (!cancelled) dispatch({ type: 'loaded', profile })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Un 404 significa que aún no tiene perfil, no que algo fallara.
        // Un 401 ya lo gestiona la capa de sesión; aquí solo se marca el fallo.
        if (toApiError(error).status === 404) dispatch({ type: 'loaded', profile: null })
        else dispatch({ type: 'failed' })
      })
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const setProfile = useCallback(
    (profile: Profile) => dispatch({ type: 'loaded', profile }),
    [],
  )

  const value = useMemo<ProfileContextValue>(
    () => ({ status: state.status, profile: state.profile, reload, setProfile }),
    [state.status, state.profile, reload, setProfile],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
