import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import { toApiError } from '@/shared/api/apiError'
import { listPostAuthors, listPostCommunities, type PostCommunityOption } from '../api/postsApi'
import type { PostAuthor } from '../model/post.types'

// Un usuario sin perfil recibe 404 en /communities/mine: simplemente no tiene comunidades.
async function loadMyCommunities(signal: AbortSignal): Promise<PostCommunityOption[]> {
  try {
    return await listPostCommunities(signal)
  } catch (error) {
    if (toApiError(error).status === 404) return []
    throw error
  }
}

async function loadAuthors(signal: AbortSignal): Promise<PostAuthor[]> {
  const authors = await listPostAuthors(signal)
  return [...authors].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/**
 * Opciones de los filtros del feed. Si fallan, el feed sigue funcionando sin ellas.
 * Las comunidades son las del usuario: los posts de comunidad solo los ven sus miembros.
 */
export function usePostFilterOptions() {
  const { isAuthenticated } = useAuth()
  const [authors, setAuthors] = useState<PostAuthor[]>([])
  const [communities, setCommunities] = useState<PostCommunityOption[]>([])
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
