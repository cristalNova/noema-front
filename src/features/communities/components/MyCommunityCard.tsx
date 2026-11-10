import { Link } from 'react-router-dom'
import { canLeave, ROLE_LABELS, type MyCommunity } from '../model/myCommunity'
import './MyCommunityCard.css'

interface MyCommunityCardProps {
  community: MyCommunity
  onLeave: (community: MyCommunity) => void
}

export function MyCommunityCard({ community, onLeave }: MyCommunityCardProps) {
  return (
    <article className="community-card my-community">
      <div className="community-card__topline">
        <span className="community-card__topic">{community.topic}</span>
        {community.isPremium && <span className="premium-badge">Premium</span>}
        <span className="my-community__role">{ROLE_LABELS[community.role]}</span>
      </div>
      <h2>{community.name}</h2>
      <p>{community.description || 'Una comunidad para compartir ideas y lecturas.'}</p>
      <div className="my-community__actions">
        <Link className="button button--secondary" to={`/communities/${community.id}`}>
          Ver comunidad
        </Link>
        {/* Solo si soy miembro y puedo salir: el propietario no (primero debería eliminarla). */}
        {canLeave(community) && (
          <button
            type="button"
            className="button my-community__leave"
            aria-label={`Salir de ${community.name}`}
            onClick={() => onLeave(community)}
          >
            Salir
          </button>
        )}
      </div>
    </article>
  )
}
