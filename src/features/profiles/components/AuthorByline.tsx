import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { profilesApi } from '../api/profilesApi'

/** El detalle del ensayo trae authorId, pero el backend no adjunta el nombre del autor. */
export function AuthorByline({ authorId, name }: { authorId: number; name?: string }) {
  const [authorName, setAuthorName] = useState<string | null>(name ?? null)

  useEffect(() => {
    if (name) return
    const controller = new AbortController()
    profilesApi.getById(authorId, controller.signal)
      .then((profile) => { if (!controller.signal.aborted) setAuthorName(profile.name) })
      .catch(() => { /* El enlace sigue disponible si falla la consulta del nombre. */ })
    return () => controller.abort()
  }, [authorId, name])

  return <p className="article-reader__author">Por <Link to={`/profiles/${authorId}`}>{authorName ?? 'Ver perfil del autor'}</Link></p>
}
