import { Link } from 'react-router-dom'
import type { Community } from '../model/community.types'

type CommunityRole = 'MEMBER' | 'MODERATOR' | 'OWNER'

interface CommunityCardProps {
  community: Community
  role?: CommunityRole
  onDelete?: () => void
  deleting?: boolean
}

const ROLE_LABELS: Record<CommunityRole, string> = {
  MEMBER: 'Miembro',
  MODERATOR: 'Moderador',
  OWNER: 'Propietario',
}

export function CommunityCard({ community, role, onDelete, deleting = false }: CommunityCardProps) {
  return (
    <article className="community-card">
      <div className="community-card__topline">
        <span className="community-card__topic">{community.topic}</span>
        {community.isPremium && <span className="premium-badge">Premium</span>}
      </div>
      <h2>{community.name}</h2>
      {role && <p className="community-card__role"><strong>Tu rol:</strong> {ROLE_LABELS[role]}</p>}
      <p>{community.description || 'Una comunidad para compartir ideas y lecturas.'}</p>
      {community.tags.length > 0 && (
        <ul className="tag-list" aria-label="Etiquetas">
          {community.tags.map((item) => (
            <li key={`${item.communityId}-${item.tag}`}>{item.tag}</li>
          ))}
        </ul>
      )}
      <div className="community-card__actions">
        <Link className="button button--secondary" to={`/communities/${community.id}`}>
          Ver comunidad
        </Link>
        {role === 'OWNER' && onDelete && (
          <button type="button" className="button button--danger" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        )}
      </div>
    </article>
  )
}
