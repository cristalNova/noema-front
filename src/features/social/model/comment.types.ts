import type { PostAuthor } from './post.types'

export type CommentTarget = { kind: 'article' | 'post'; id: number }

export interface Comment {
  id: number
  authorId: number
  // El listado la incluye; POST y PATCH devuelven el comentario sin esta relación.
  author: PostAuthor
  articleId: number | null
  postId: number | null
  parentCommentId: number | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface CommentNode {
  comment: Comment
  replies: CommentNode[]
}
