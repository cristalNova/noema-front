import { useEffect, useState } from 'react'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { getPost } from '../api/postsApi'
import type { Post } from '../model/post.types'

interface Settled {
  attempt: number
  post: Post | null
  error: string
  isUnavailable: boolean
}

/** Carga un post. Quien la usa debe remontarla al cambiar de id para no mostrar datos del anterior. */
export function usePost(id: number) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getPost(id, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) setSettled({ attempt, post, error: '', isUnavailable: false })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, post: null, error: getErrorMessage(reason), isUnavailable: toApiError(reason).status === 404 })
      })
    return () => controller.abort()
  }, [id, attempt])

  const current = settled?.attempt === attempt ? settled : null
  return {
    post: current?.post ?? null,
    error: current?.error ?? '',
    isUnavailable: current?.isUnavailable ?? false,
    isLoading: current === null,
    retry: () => setAttempt((value) => value + 1),
  }
}
