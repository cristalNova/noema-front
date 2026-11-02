import { Link } from 'react-router-dom'
import type { Community } from '../model/community.types'

interface CommunityCardProps {
  community: Community
}

export function CommunityCard({ community }: CommunityCardProps) {
  return (
    <article className="community-card">
      <div className="community-card__topline">
        <span className="community-card__topic">{community.topic}</span>
        {community.isPremium && <span className="premium-badge">Premium</span>}
      </div>
      <h2>{community.name}</h2>
      <p>{community.description || 'Una comunidad para compartir ideas y lecturas.'}</p>
      {community.tags.length > 0 && (
        <ul className="tag-list" aria-label="Etiquetas">
          {community.tags.map((item) => (
            <li key={`${item.communityId}-${item.tag}`}>{item.tag}</li>
          ))}
        </ul>
      )}
      <Link className="button button--secondary" to={`/communities/${community.id}`}>
        Ver comunidad
      </Link>
    </article>
  )
}
