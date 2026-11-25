import { useRef, useState } from 'react'
import { toApiError } from '@/shared/api/apiError'
import { deletePost, listMyPosts } from '../api/postsApi'
import type { Post } from '../model/post.types'
import { usePagedPosts, type PostPageRequest } from './usePagedPosts'

const requestMyPosts: PostPageRequest = (page, signal) => listMyPosts({ page }, signal)

export function useMyPosts() {
  const list = usePagedPosts(requestMyPosts)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notice, setNotice] = useState('')
  const pending = useRef(false)

  /** Devuelve el mensaje de error para mostrarlo en el diálogo, o null si terminó bien. */
  async function remove(post: Post): Promise<string | null> {
    if (pending.current) return 'Hay otra operación en curso. Intenta de nuevo.'
    pending.current = true
    setIsDeleting(true)
    setNotice('')
    try {
      await deletePost(post.id)
      setNotice('Se eliminó tu publicación.')
      list.reload()
      return null
    } catch (error) {
      const { status, message } = toApiError(error)
      if (status !== 404) return message
      // Ya no existe (por ejemplo, se borró desde otra pestaña): el resultado es el que se buscaba.
      setNotice('Esa publicación ya no estaba disponible.')
      list.reload()
      return null
    } finally {
      pending.current = false
      setIsDeleting(false)
    }
  }

  return { list, isDeleting, notice, remove }
}
