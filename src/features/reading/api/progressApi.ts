import { httpClient } from '@/shared/api'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import type { Paginated } from '@/shared/types/Paginated'

export interface ReadingProgress {
  profileId: number
  articleId: number
  percentage: number
  isCompleted: boolean
  lastReadAt: string
  article: ArticleSummary
}

export async function getProgress(articleId: number, signal?: AbortSignal): Promise<ReadingProgress | null> {
  const response = await httpClient.get<ReadingProgress | null>(`/progress/${articleId}`, { signal })
  return response.data
}

export async function listProgress(page = 1, limit = 100, signal?: AbortSignal): Promise<Paginated<ReadingProgress>> {
  const response = await httpClient.get<Paginated<ReadingProgress>>('/progress', { params: { page, limit }, signal })
  return response.data
}

/** El API no ofrece filtro por completado: se recorren sus páginas antes de filtrar. */
export async function listInProgress(signal?: AbortSignal): Promise<ReadingProgress[]> {
  const entries: ReadingProgress[] = []
  let page = 1
  while (true) {
    const result = await listProgress(page, 100, signal)
    entries.push(...result.data)
    if (result.data.length === 0 || entries.length >= result.total) break
    page += 1
  }
  return entries.filter((entry) => !entry.isCompleted && entry.percentage > 0 && entry.percentage < 100)
    .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())
}

export async function saveProgress(articleId: number, percentage: number): Promise<ReadingProgress> {
  const response = await httpClient.put<ReadingProgress>(`/progress/${articleId}`, { percentage })
  return response.data
}

export async function resetProgress(articleId: number): Promise<void> {
  await httpClient.delete(`/progress/${articleId}`)
}
