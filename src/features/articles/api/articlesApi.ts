import { httpClient } from '../../../shared/api'
import type { Article, ArticleStatus, ArticleSummary, DraftInput } from '../model/article.types'
import type { Paginated } from '../../../shared/types/Paginated'

// El servidor asigna DRAFT y el autor a partir del JWT. No enviar status.
export async function createDraft(input: DraftInput): Promise<Article> {
  const response = await httpClient.post<Article>('/articles', input)
  return response.data
}

export async function updateDraft(id: number, input: DraftInput): Promise<Article> {
  const response = await httpClient.patch<Article>(`/articles/${id}`, input)
  return response.data
}

export async function getMyArticle(id: number, signal?: AbortSignal): Promise<Article> {
  const response = await httpClient.get<Article>(`/articles/mine/${id}`, { signal })
  return response.data
}

// /mine solo admite page y limit. Recorrer todas las páginas antes de filtrar
// por estado evita presentar resultados incompletos al escritor.
export async function listMyArticles(signal?: AbortSignal): Promise<ArticleSummary[]> {
  const articles = new Map<number, ArticleSummary>()
  let page = 1
  let received = 0
  let total: number
  do {
    const response = await httpClient.get<Paginated<ArticleSummary>>('/articles/mine', {
      params: { page, limit: 100 }, signal,
    })
    for (const article of response.data.data) articles.set(article.id, article)
    received += response.data.data.length
    total = response.data.total
    if (response.data.data.length === 0) break
    page += 1
  } while (received < total)
  return [...articles.values()]
}

export async function changeArticleStatus(id: number, status: ArticleStatus): Promise<ArticleSummary> {
  const response = await httpClient.patch<ArticleSummary>(`/articles/${id}/status`, { status })
  return response.data
}

export async function deleteArticle(id: number): Promise<void> {
  await httpClient.delete(`/articles/${id}`)
}
