import type { Profile } from '@/features/communities/model/community.types'

export type PostType = 'ORIGINAL' | 'REPLY' | 'REPOST' | 'QUOTE'
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'COMMUNITY'

export type PostAuthor = Pick<Profile, 'id' | 'name' | 'username' | 'profilePhoto'>

// El backend carga owner y article, pero no la relación community: solo llega communityId.
export interface Post {
  id: number
  ownerId: number
  owner: PostAuthor
  communityId: number | null
  articleId?: number | null
  article?: { id: number; title: string } | null
  parentPostId?: number | null
  postType?: PostType
  visibility?: PostVisibility
  content: string | null
  likes: number
  repostCount: number
  commentCount: number
  createdAt: string
}
