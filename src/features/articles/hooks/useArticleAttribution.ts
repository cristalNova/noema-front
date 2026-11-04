import { useCallback, useEffect, useState } from 'react'
import { getCommunity, type CommunityOption } from '../../communities/api/communitiesApi'
import { profilesApi, type AuthorOption } from '../../profiles/api/profilesApi'
import type { ArticleSummary } from '../model/article.types'

export interface Attribution {
  id: number
  /** null cuando no se pudo resolver el nombre (la petición falló o sigue en curso). */
  name: string | null
}

type Attributable = Pick<ArticleSummary, 'authorId' | 'author' | 'communityId' | 'community'>

/**
 * Resuelve el autor y la comunidad de cada ensayo. GET /articles solo devuelve authorId y
 * communityId (sin las relaciones), así que los nombres salen, por orden, de:
 *   1. la relación incluida en el propio ensayo, si algún día el backend la envía;
 *   2. las listas que la pantalla ya cargó (autores y comunidades del lector);
 *   3. GET /profiles/:id y GET /communities/:id, solo para lo que siga faltando.
 */
export function useArticleAttribution(
  articles: Attributable[],
  // loading: la lista aún se está cargando; hasta que termine no se pide nada por id.
  known: { authors?: AuthorOption[]; communities?: CommunityOption[]; authorsLoading?: boolean; communitiesLoading?: boolean } = {},
) {
  // null = la petición falló: queda registrada para no reintentarla y el ensayo se muestra sin ese dato.
  const [fetchedAuthors, setFetchedAuthors] = useState<Map<number, string | null>>(new Map())
  const [fetchedCommunities, setFetchedCommunities] = useState<Map<number, string | null>>(new Map())

  const knownAuthors = new Map((known.authors ?? []).map(({ id, name }) => [id, name]))
  const knownCommunities = new Map((known.communities ?? []).map(({ id, name }) => [id, name]))

  const missingAuthors = known.authorsLoading ? [] : [...new Set(articles
    .filter((article) => !article.author?.name && !knownAuthors.has(article.authorId) && !fetchedAuthors.has(article.authorId))
    .map((article) => article.authorId))]
  const missingCommunities = known.communitiesLoading ? [] : [...new Set(articles
    .filter((article) => article.communityId != null && !article.community?.name && !knownCommunities.has(article.communityId) && !fetchedCommunities.has(article.communityId))
    .map((article) => article.communityId as number))]
  const authorsKey = missingAuthors.join(',')
  const communitiesKey = missingCommunities.join(',')

  useEffect(() => {
    if (!authorsKey) return
    const ids = authorsKey.split(',').map(Number)
    const controller = new AbortController()
    Promise.allSettled(ids.map((id) => profilesApi.getById(id, controller.signal))).then((results) => {
      if (controller.signal.aborted) return
      setFetchedAuthors((previous) => {
        const next = new Map(previous)
        results.forEach((result, index) => { next.set(ids[index], result.status === 'fulfilled' ? result.value.name : null) })
        return next
      })
    })
    return () => controller.abort()
  }, [authorsKey])

  useEffect(() => {
    if (!communitiesKey) return
    const ids = communitiesKey.split(',').map(Number)
    const controller = new AbortController()
    Promise.allSettled(ids.map((id) => getCommunity(id, controller.signal))).then((results) => {
      if (controller.signal.aborted) return
      setFetchedCommunities((previous) => {
        const next = new Map(previous)
        results.forEach((result, index) => { next.set(ids[index], result.status === 'fulfilled' ? result.value.name : null) })
        return next
      })
    })
    return () => controller.abort()
  }, [communitiesKey])

  const authorOf = useCallback((article: Attributable): Attribution | null => {
    const name = article.author?.name || knownAuthors.get(article.authorId) || fetchedAuthors.get(article.authorId)
    if (name) return { id: article.authorId, name }
    // Sin nombre: solo se ofrece el enlace genérico si la consulta ya falló; mientras está pendiente, nada (evita parpadeos).
    return fetchedAuthors.has(article.authorId) ? { id: article.authorId, name: null } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known.authors, fetchedAuthors])

  // Si el nombre no se pudo resolver (la consulta falló), igual se indica que el ensayo es de una comunidad.
  const communityOf = useCallback((article: Attributable): Attribution | null => {
    if (article.communityId == null) return null
    const name = article.community?.name || knownCommunities.get(article.communityId) || fetchedCommunities.get(article.communityId)
    if (name) return { id: article.communityId, name }
    return fetchedCommunities.has(article.communityId) ? { id: article.communityId, name: null } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known.communities, fetchedCommunities])

  return { authorOf, communityOf }
}
