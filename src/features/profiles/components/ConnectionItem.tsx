import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRequireAuth } from '@/features/auth'
import type { FollowViewer } from '../hooks/useFollowToggle'
import type { Profile } from '../model/Profile'
import './ConnectionItem.css'

interface ConnectionItemProps {
  profile: Profile
  viewer: FollowViewer
  /** El perfil de quien mira: su propia fila no lleva botón. */
  myId: number | null
  following: boolean
  pending: boolean
  onToggle: (profileId: number) => void
  /** Se llama al salir hacia otra página (por ejemplo, para cerrar la ventana que contiene la lista). */
  onNavigate?: () => void
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

export function ConnectionItem({ profile, viewer, myId, following, pending, onToggle, onNavigate }: ConnectionItemProps) {
  const requireAuth = useRequireAuth()
  const [photoFailed, setPhotoFailed] = useState(false)
  const to = `/profiles/${profile.id}`
  const isMe = myId === profile.id

  function renderAction() {
    if (isMe) return null

    if (viewer === 'no-profile') {
      return (
        <Link className="button button--secondary" to="/profile/new" state={{ from: window.location.pathname + window.location.search }} onClick={onNavigate}>
          Seguir
        </Link>
      )
    }

    if (viewer === 'visitor') {
      return (
        <button
          type="button"
          className="button button--secondary"
          aria-label={`Seguir a ${profile.name}`}
          onClick={() => requireAuth('seguir a esta persona')}
        >
          Seguir
        </button>
      )
    }

    if (viewer === 'loading') {
      return (
        <button type="button" className="button button--secondary" aria-label={`Seguir a ${profile.name}`} disabled>
          Seguir
        </button>
      )
    }

    return (
      <button
        type="button"
        className={`button ${following ? 'button--secondary' : 'button--primary'}`}
        aria-label={`Seguir a ${profile.name}`}
        aria-pressed={following}
        disabled={pending}
        onClick={() => onToggle(profile.id)}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    )
  }

  return (
    <li className="connection">
      <Link to={to} className="connection__identity" onClick={onNavigate} aria-label={`Ver el perfil de ${profile.name}, @${profile.username}`}>
        <span className="connection__avatar" aria-hidden="true">
          {initials(profile.name)}
          {profile.photoUrl && !photoFailed && <img src={profile.photoUrl} alt="" onError={() => setPhotoFailed(true)} />}
        </span>
        <span className="connection__names">
          <span className="connection__name">{profile.name}</span>
          <span className="connection__username">@{profile.username}</span>
        </span>
      </Link>
      <div className="connection__action">{renderAction()}</div>
    </li>
  )
}
