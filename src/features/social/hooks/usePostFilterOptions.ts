import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import { listMyCommunityFilterOptions, type CommunityOption } from '@/features/communities/api/communitiesApi'
import { listAuthors, type AuthorOption } from '@/features/profiles/api/profilesApi'
import { toApiError } from '@/shared/api/apiError'

// Un usuario sin perfil recibe 404 en /communities/mine: simplemente no tiene comunidades.
async function loadMyCommunities(signal: AbortSignal): Promise<CommunityOption[]> {
  try {
    return await listMyCommunityFilterOptions(signal)
  } catch (error) {
    if (toApiError(error).status === 404) return []
    throw error
  }
}

async function loadAuthors(signal: AbortSignal): Promise<AuthorOption[]> {
  const authors = await listAuthors(signal)
  return [...authors].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/**
 * Opciones de los filtros del feed. Si fallan, el feed sigue funcionando sin ellas.
 * Las comunidades son las del usuario: los posts de comunidad solo los ven sus miembros.
 */
export function usePostFilterOptions() {
  const { isAuthenticated } = useAuth()
  const [authors, setAuthors] = useState<AuthorOption[]>([])
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    loadAuthors(controller.signal)
      .then(setAuthors)
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    loadMyCommunities(controller.signal)
      .then(setCommunities)
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true)
      })
    return () => controller.abort()
  }, [isAuthenticated])

  return { authors, communities, canFilterByCommunity: isAuthenticated, hasError }
}
