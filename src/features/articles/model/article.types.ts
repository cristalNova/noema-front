import type { Community, Profile } from '../../communities/model/community.types'

export interface ArticleTag {
  articleId: number
  tag: string
}

export interface Article extends DraftInput {
  id: number
  authorId: number
  author?: Profile
  communityId: number | null
  community: Community | null
  status: ArticleStatus
  updatedAt: string
  publishedAt: string | null
  articleTags: ArticleTag[]
  locked?: boolean
  collection?: { id: number; title: string } | null
}
// Campos que acepta POST/PATCH /articles. Las etiquetas no van aquí: se guardan
// aparte con PUT /article-tags/article/:id (el backend rechaza campos desconocidos).
export interface DraftInput {
  title: string
  description: string
  content: string
  isPremium: boolean
  communityId: number | null
  collectionId: number | null
  collectionPosition: number | null
}
// Estado completo del editor: el ensayo más sus etiquetas.
export interface DraftValues extends DraftInput {
  tags: string[]
}

export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

// Los listados no incluyen content (select: false en el backend).
export type ArticleSummary = Omit<Article, 'content'>

export type DraftField = keyof DraftValues
export type DraftErrors = Partial<Record<DraftField, string[]>>
