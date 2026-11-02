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
