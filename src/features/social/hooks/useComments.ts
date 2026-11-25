import { useEffect, useState } from 'react'
import { useMyProfile } from '@/features/profiles'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { createComment, deleteComment, listAllComments, updateComment } from '../api/commentsApi'
import type { Comment, CommentTarget } from '../model/comment.types'
import { removeCommentThread } from '../model/comments'

/**
 * Carga y modifica los comentarios de un ensayo o post. Las operaciones devuelven el
 * mensaje de error, o null si terminaron bien, para mostrarlo junto a lo que lo causó.
 * Quien la usa debe remontarla al cambiar de destino o de sesión.
 */
export function useComments(target: CommentTarget) {
  const { kind, id } = target
  const { profile } = useMyProfile()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listAllComments({ kind, id }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setComments(data)
        setLoadError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [kind, id, attempt])

  async function add(content: string, parentCommentId?: number): Promise<string | null> {
    try {
      const saved = await createComment(content, { kind, id }, parentCommentId)
      if (profile) {
        const author = { id: profile.id, name: profile.name, username: profile.username, profilePhoto: profile.photoUrl ?? undefined }
        setComments((previous) => [...(previous ?? []), { ...saved, author }])
      } else {
        setAttempt((value) => value + 1)
      }
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  async function edit(comment: Comment, content: string): Promise<string | null> {
    try {
      const saved = await updateComment(comment.id, content)
      setComments((previous) => (previous ?? []).map((item) => (
        item.id === comment.id ? { ...item, content: saved.content, updatedAt: saved.updatedAt } : item
      )))
      return null
    } catch (reason) {
      return getErrorMessage(reason)
    }
  }

  async function remove(comment: Comment): Promise<string | null> {
    try {
      await deleteComment(comment.id)
    } catch (reason) {
      // Si ya no existe (se borró en otra pestaña), el resultado es el que se buscaba.
      if (toApiError(reason).status !== 404) return getErrorMessage(reason)
    }
    setComments((previous) => removeCommentThread(previous ?? [], comment.id))
    return null
  }

  return {
    comments: comments ?? [],
    isLoading: comments === null && !loadError,
    loadError,
    retry: () => {
      setLoadError('')
      setAttempt((value) => value + 1)
    },
    add,
    edit,
    remove,
  }
}
