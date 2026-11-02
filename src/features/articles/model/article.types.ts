import type { Community, Profile } from '../../communities/model/community.types'

export interface ArticleTag {
  articleId: number
  tag: string
}

export interface Article {
  id: number
  authorId: number
  author: Profile
  communityId: number | null
  community: Community | null
  title: string
  description?: string
  content: string
  isPremium: boolean
  publishedAt: string | null
  articleTags: ArticleTag[]
}
export interface DraftInput {
  title: string
  description: string
  content: string
  isPremium: boolean
  communityId: number | null
}

export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface Article extends DraftInput {
  id: number
  authorId: number
  status: ArticleStatus
  updatedAt: string
}

// Los listados no incluyen content (select: false en el backend).
export type ArticleSummary = Omit<Article, 'content'>

export type DraftField = keyof DraftInput
export type DraftErrors = Partial<Record<DraftField, string[]>>
