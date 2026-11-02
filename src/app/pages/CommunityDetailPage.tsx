import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCommunity } from '../../features/communities/api/communitiesApi'
import { CommunityMembershipAction } from '../../features/communities/components/CommunityMembershipAction'
import type { Community } from '../../features/communities/model/community.types'
import { getErrorMessage } from '../../shared/api/apiError'

export function CommunityDetailPage() {
  const { id } = useParams()
  const communityId = Number(id)
  const isInvalidId = !Number.isInteger(communityId) || communityId < 1
  const [community, setCommunity] = useState<Community | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    if (isInvalidId) return () => { active = false }

    getCommunity(communityId)
      .then((response) => {
        if (active) setCommunity(response)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [communityId, isInvalidId, retry])

  if (isInvalidId) {
    return <main className="page-shell"><p className="status-message status-message--error" role="alert">La comunidad solicitada no es válida.</p></main>
  }
  if (isLoading) return <main className="page-shell"><p className="status-message" role="status">Cargando comunidad…</p></main>
  if (error) {
    return (
      <main className="page-shell">
        <p className="status-message status-message--error" role="alert">{getErrorMessage(error)}</p>
        <button type="button" className="button button--secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
      </main>
    )
  }
  if (!community) return null

  return (
    <main className="page-shell">
      <Link className="back-link" to="/communities">← Volver a comunidades</Link>
      <article className="community-detail">
        <div className="community-card__topline">
          <span className="community-card__topic">{community.topic}</span>
          {community.isPremium && <span className="premium-badge">Premium</span>}
        </div>
        <h1>{community.name}</h1>
        <p>{community.description || 'Una comunidad para compartir ideas y lecturas.'}</p>
        {community.tags.length > 0 && (
          <ul className="tag-list" aria-label="Etiquetas">
            {community.tags.map((item) => <li key={`${item.communityId}-${item.tag}`}>{item.tag}</li>)}
          </ul>
        )}
        <CommunityMembershipAction community={community} />
      </article>
    </main>
  )
}
