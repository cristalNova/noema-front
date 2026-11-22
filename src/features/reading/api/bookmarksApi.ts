import { httpClient } from '@/shared/api'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import type { Paginated } from '@/shared/types/Paginated'

export interface Bookmark {
  id: number
  articleId: number
  article?: ArticleSummary
  highlightedText: string
  startPosition: number
  endPosition: number
  note?: string | null
  createdAt: string
}

export type NewBookmark = Pick<Bookmark, 'articleId' | 'highlightedText' | 'startPosition' | 'endPosition'> & { note?: string }

export async function listBookmarks(page = 1, limit = 10, articleId?: number, signal?: AbortSignal): Promise<Paginated<Bookmark>> {
  const response = await httpClient.get<Paginated<Bookmark>>('/bookmarks', { params: { page, limit, articleId }, signal })
  return response.data
}

export async function listArticleBookmarks(articleId: number, signal?: AbortSignal): Promise<Bookmark[]> {
  const items: Bookmark[] = []
  let page = 1
  while (true) {
    const result = await listBookmarks(page, 100, articleId, signal)
    items.push(...result.data)
    if (!result.data.length || items.length >= result.total) return items
    page += 1
  }
}

export async function createBookmark(input: NewBookmark): Promise<Bookmark> {
  const response = await httpClient.post<Bookmark>('/bookmarks', input)
  return response.data
}

export async function updateBookmark(id: number, note: string): Promise<Bookmark> {
  const response = await httpClient.patch<Bookmark>(`/bookmarks/${id}`, { note })
  return response.data
}

export async function deleteBookmark(id: number): Promise<void> {
  await httpClient.delete(`/bookmarks/${id}`)
}
