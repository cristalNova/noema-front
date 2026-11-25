import { httpClient } from '@/shared/api'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import type { Paginated } from '@/shared/types/Paginated'

export interface Favorite {
  profileId: number
  articleId: number
  createdAt: string
  article: ArticleSummary
}

export async function listFavorites(page = 1, limit = 10, signal?: AbortSignal): Promise<Paginated<Favorite>> {
  const response = await httpClient.get<Paginated<Favorite>>('/favorites', { params: { page, limit }, signal })
  return response.data
}

export async function listFavoriteIds(signal?: AbortSignal): Promise<Set<number>> {
  const ids = new Set<number>()
  let page = 1
  let received = 0
  while (true) {
    const result = await listFavorites(page, 100, signal)
    for (const favorite of result.data) ids.add(favorite.articleId)
    received += result.data.length
    if (!result.data.length || received >= result.total) break
    page += 1
  }
  return ids
}

export async function addFavorite(articleId: number): Promise<void> {
  await httpClient.post(`/favorites/${articleId}`)
}

export async function removeFavorite(articleId: number): Promise<void> {
  await httpClient.delete(`/favorites/${articleId}`)
}
