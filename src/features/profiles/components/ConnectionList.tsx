import { Link } from 'react-router-dom'
import { Pagination } from '@/shared/components/Pagination'
import { useConnections, type ConnectionKind } from '../hooks/useConnections'
import { useFollowToggle } from '../hooks/useFollowToggle'
import { ConnectionItem } from './ConnectionItem'
import './ConnectionList.css'

interface ConnectionListProps {
  profileId: number
  profileName: string
  kind: ConnectionKind
  /** Es el perfil de quien mira: cambia el texto del estado vacío. */
  isOwn: boolean
  onNavigate?: () => void
}

function emptyMessage(kind: ConnectionKind, isOwn: boolean, name: string) {
  if (kind === 'followers') {
    return isOwn
      ? { title: 'Aún nadie te sigue.', text: 'Publica ensayos y participa en las comunidades: quien te lea podrá seguirte y aparecerá aquí.' }
      : { title: 'Todavía no hay seguidores.', text: `Cuando alguien siga a ${name}, aparecerá aquí.` }
  }
  return isOwn
    ? { title: 'Todavía no sigues a nadie.', text: 'Explora ensayos y comunidades para encontrar personas afines y seguirlas.' }
    : { title: 'Aún no sigue a nadie.', text: `Las personas a las que siga ${name} aparecerán aquí.` }
}

export function ConnectionList({ profileId, profileName, kind, isOwn, onNavigate }: ConnectionListProps) {
  const list = useConnections(profileId, kind)
  const follow = useFollowToggle()
  const label = kind === 'followers' ? 'Seguidores' : 'Siguiendo'

  if (list.isLoading) {
    return (
      <p className="status-message" role="status">
        Cargando {label.toLowerCase()}…
      </p>
    )
  }

  if (list.error) {
    return (
      <div className="connection-state" role="alert">
        <p>{list.error}</p>
        <button type="button" className="button button--secondary" onClick={list.reload}>
          Reintentar
        </button>
      </div>
    )
  }

  if (list.total === 0) {
    const { title, text } = emptyMessage(kind, isOwn, profileName)
    return (
      <div className="connection-state">
        <h3>{title}</h3>
        <p>{text}</p>
        {isOwn && kind === 'following' && (
          <Link className="button button--secondary" to="/articles" onClick={onNavigate}>
            Explorar ensayos
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      {follow.error && (
        <p className="status-message--error" role="alert">
          {follow.error}
        </p>
      )}
      <ul className="connection-list" aria-label={label}>
        {list.profiles.map((profile) => (
          <ConnectionItem
            key={profile.id}
            profile={profile}
            viewer={follow.viewer}
            myId={follow.myId}
            following={follow.isFollowing(profile.id)}
            pending={follow.isPending(profile.id)}
            onToggle={(id) => void follow.toggle(id)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      {list.total > list.limit && (
        <Pagination page={list.page} total={list.total} limit={list.limit} label={`Paginación de ${label.toLowerCase()}`} onPageChange={list.setPage} />
      )}
    </>
  )
}
