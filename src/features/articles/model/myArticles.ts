import type { ArticleStatus, ArticleSummary } from './article.types'

export const ARTICLE_STATUSES: ArticleStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
export const STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado',
}
export const STATUS_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: ['PUBLISHED'],
}
export const ARTICLES_PAGE_SIZE = 10

export function selectArticles(articles: ArticleSummary[], status: ArticleStatus | 'ALL', page: number) {
  const filtered = articles.filter((article) => status === 'ALL' || article.status === status)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLES_PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  return {
    rows: filtered.slice((currentPage - 1) * ARTICLES_PAGE_SIZE, currentPage * ARTICLES_PAGE_SIZE),
    total: filtered.length, totalPages, currentPage,
  }
}
