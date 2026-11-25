import { useEffect, useState } from 'react'
import { useAuth } from '../../auth'
import { ApiError } from '../../../shared/api/apiError'
import { listAuthors, type AuthorOption } from '../../profiles/api/profilesApi'
import { listMyCommunityFilterOptions, type CommunityOption } from '../../communities/api/communitiesApi'
import { listArticleTags, type TagOption } from '../api/articleTagsApi'
import { listCollections, type CollectionOption } from '../api/collectionsApi'

export type OptionStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface OptionList<T> {
  data: T[]
  status: OptionStatus
  retry: () => void
}

const NONE: never[] = []

// Cada lista de opciones se carga por separado: si una falla, el resto de filtros sigue funcionando.
function useOptionList<T>(load: (signal: AbortSignal) => Promise<T[]>, enabled: boolean, scope: string): OptionList<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<{ key: string; status: 'ready' | 'error'; data: T[] } | null>(null)
  const requestKey = `${scope}:${attempt}`

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSettled({ key: requestKey, status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setSettled({ key: requestKey, status: 'error', data: NONE }) })
    return () => controller.abort()
  }, [enabled, load, requestKey])

  const current = enabled && settled?.key === requestKey ? settled : null
  return {
    data: current?.data ?? NONE,
    status: !enabled ? 'idle' : (current?.status ?? 'loading'),
    retry: () => setAttempt((value) => value + 1),
  }
}

// Un usuario sin perfil recibe 404 en /communities/mine: simplemente no tiene comunidades.
async function loadMyCommunities(signal: AbortSignal): Promise<CommunityOption[]> {
  try {
    return await listMyCommunityFilterOptions(signal)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return []
    throw error
  }
}

async function loadAuthors(signal: AbortSignal) {
  const authors = await listAuthors(signal)
  return [...authors].sort((a: AuthorOption, b: AuthorOption) => a.name.localeCompare(b.name, 'es'))
}

async function loadCollections(signal: AbortSignal) {
  const collections = await listCollections(signal)
  return [...collections].sort((a: CollectionOption, b: CollectionOption) => a.title.localeCompare(b.title, 'es'))
}

export function useFilterOptions() {
  const { session } = useAuth()
  const userId = session?.user.id
  const isAuthenticated = userId !== undefined

  const tags = useOptionList<TagOption>(listArticleTags, true, 'tags')
  const authors = useOptionList<AuthorOption>(loadAuthors, true, 'authors')
  const collections = useOptionList<CollectionOption>(loadCollections, true, 'collections')
  // Solo con sesión: sin ella, el backend oculta todo ensayo de comunidad.
  const communities = useOptionList<CommunityOption>(loadMyCommunities, isAuthenticated, `communities:${userId}`)

  const lists = [tags, authors, collections, communities]
  return {
    tags, authors, collections, communities,
    canFilterByCommunity: isAuthenticated,
    hasError: lists.some((list) => list.status === 'error'),
    retryFailed: () => lists.forEach((list) => { if (list.status === 'error') list.retry() }),
  }
}

export type FilterOptions = ReturnType<typeof useFilterOptions>
