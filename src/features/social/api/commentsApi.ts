import { httpClient } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import type { Comment, CommentTarget } from '../model/comment.types'

const PAGE_SIZE = 100

/**
 * Todos los comentarios de un ensayo o post. El backend pagina la lista plana, sin
 * distinguir respuestas: una página suelta podría traer respuestas sin su padre.
 */
export async function listAllComments({ kind, id }: CommentTarget, signal?: AbortSignal): Promise<Comment[]> {
  const comments: Comment[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await httpClient.get<Paginated<Comment>>(`/comments/${kind}/${id}`, {
      params: { page, limit: PAGE_SIZE },
      signal,
    })
    comments.push(...data.data)
    if (data.data.length === 0 || page * data.limit >= data.total) return comments
  }
}

/** Una respuesta hereda del padre el ensayo o post: solo se envía el destino en los principales. */
export async function createComment(content: string, target: CommentTarget, parentCommentId?: number): Promise<Comment> {
  const destination = parentCommentId !== undefined
    ? { parentCommentId }
    : target.kind === 'article' ? { articleId: target.id } : { postId: target.id }
  const response = await httpClient.post<Comment>('/comments', { content, ...destination })
  return response.data
}

export async function updateComment(id: number, content: string): Promise<Comment> {
  const response = await httpClient.patch<Comment>(`/comments/${id}`, { content })
  return response.data
}

/** Elimina también sus respuestas. */
export async function deleteComment(id: number): Promise<void> {
  await httpClient.delete(`/comments/${id}`)
}
