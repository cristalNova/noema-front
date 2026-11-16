import { useEffect, useState } from 'react'
import { getPostOnce } from '../api/postsApi'
import type { Post } from '../model/post.types'

type Settled = { id: number; post: Post | null }

/**
 * El post al que apunta una respuesta, repost o cita. `status` es 'unavailable' si fue eliminado
 * o el lector no tiene acceso (el backend responde 404 en ambos casos), o si la petición falló.
 */
export function useRelatedPost(id: number | null | undefined) {
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (id == null) return
    let cancelled = false
    getPostOnce(id)
      .then((post) => { if (!cancelled) setSettled({ id, post }) })
      .catch(() => { if (!cancelled) setSettled({ id, post: null }) })
    return () => { cancelled = true }
  }, [id])

  if (id == null) return { post: null, status: 'none' as const }
  if (settled?.id !== id) return { post: null, status: 'loading' as const }
  return settled.post ? { post: settled.post, status: 'ready' as const } : { post: null, status: 'unavailable' as const }
}
