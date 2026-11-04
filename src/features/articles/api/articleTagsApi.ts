// /article-tags
import { httpClient } from '../../../shared/api'

export interface TagOption {
  tag: string
  articles: number
}

// GET /article-tags: etiquetas en uso en ensayos publicados (de la más usada a la menos usada).
// El backend solo cuenta los ensayos públicos, no los exclusivos de una comunidad.
export async function listArticleTags(signal?: AbortSignal): Promise<TagOption[]> {
  const response = await httpClient.get<TagOption[]>('/article-tags', { signal })
  return response.data
}

// PUT /article-tags/article/:id: reemplaza todas las etiquetas del ensayo (solo su autor).
// El backend normaliza (trim + minúsculas), admite máximo 10 y devuelve la lista final.
export async function replaceArticleTags(articleId: number, tags: string[]): Promise<string[]> {
  const response = await httpClient.put<string[]>(`/article-tags/article/${articleId}`, { tags })
  return response.data
}

// El onboarding reutiliza el mismo catálogo público de etiquetas.
export type CatalogTag = TagOption
export const listCatalogTags = listArticleTags
