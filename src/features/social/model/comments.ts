import type { Comment, CommentNode } from './comment.types'

export const COMMENT_MAX_LENGTH = 2000
export const COMMENTS_PER_PAGE = 10

/**
 * Convierte la lista plana del backend en hilos, conservando su orden.
 * Un comentario cuyo padre no llegó se trata como principal para no perderlo.
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>()
  for (const comment of comments) nodes.set(comment.id, { comment, replies: [] })

  const roots: CommentNode[] = []
  for (const comment of comments) {
    const node = nodes.get(comment.id) as CommentNode
    const parent = comment.parentCommentId === null ? undefined : nodes.get(comment.parentCommentId)
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }
  return roots
}

export function countReplies(node: CommentNode): number {
  return node.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0)
}

/** Quita un comentario y sus respuestas, igual que el borrado en cascada del backend. */
export function removeCommentThread(comments: Comment[], id: number): Comment[] {
  const removed = new Set([id])
  // El backend ordena por fecha, así que cada padre aparece antes que sus respuestas.
  for (const comment of comments) {
    if (comment.parentCommentId !== null && removed.has(comment.parentCommentId)) removed.add(comment.id)
  }
  return comments.filter((comment) => !removed.has(comment.id))
}

/** Margen de un segundo: al crearlo, ambas fechas pueden diferir por milisegundos. */
export function wasEdited(comment: Comment): boolean {
  return new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000
}
