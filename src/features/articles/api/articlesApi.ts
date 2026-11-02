import { httpClient } from '../../../shared/api'
import type { Article, DraftInput } from '../model/article.types'

// El servidor asigna DRAFT y el autor a partir del JWT. No enviar status.
export async function createDraft(input: DraftInput): Promise<Article> {
  const response = await httpClient.post<Article>('/articles', input)
  return response.data
}

export async function updateDraft(id: number, input: DraftInput): Promise<Article> {
  const response = await httpClient.patch<Article>(`/articles/${id}`, input)
  return response.data
}
