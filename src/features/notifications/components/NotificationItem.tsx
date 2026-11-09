import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/shared/utils/relativeTime'
import type { AppNotification } from '../model/Notification'
import { describeNotification } from '../model/notificationContent'
import './NotificationItem.css'

interface NotificationItemProps {
  notification: AppNotification
  /** Se llama solo con notificaciones no leídas. */
  onMarkRead: (id: number) => void
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' })

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const { id, actor, isRead, createdAt } = notification
  const { actorName, action, href } = describeNotification(notification)
  const item = useRef<HTMLLIElement>(null)

  const message = (
    <>
      <strong>{actorName}</strong> {action}
    </>
  )

  // Abrir (clic en el texto) marca como leída y deja que el enlace navegue al recurso.
  function handleOpen() {
    if (!isRead) onMarkRead(id)
  }

  // Marcar sin abrir: el botón desaparece, así que el foco pasa al elemento para no perderse.
  function handleMarkOnly() {
    onMarkRead(id)
    item.current?.focus()
  }

  let text = message
  if (href) {
    text = <Link to={href} onClick={handleOpen}>{message}</Link>
  } else if (!isRead) {
    // Sin página propia (p. ej. un comentario): abrirla solo puede marcarla como leída.
    text = <button type="button" className="notification__open" onClick={handleOpen}>{message}</button>
  }

  return (
    <li
      ref={item}
      tabIndex={-1}
      className={`notification ${isRead ? 'notification--read' : 'notification--unread'}`}
    >
      <span className="notification__avatar" aria-hidden="true">
        {actor?.photoUrl ? <img src={actor.photoUrl} alt="" /> : actorName.charAt(0).toUpperCase()}
      </span>
      <div className="notification__body">
        <p className="notification__text">
          {/* El color no basta para distinguir: el estado también se anuncia con texto. */}
          {!isRead && <span className="notification__sr">No leída. </span>}
          {text}
        </p>
        <div className="notification__meta">
          <time className="notification__time" dateTime={createdAt} title={dateFormat.format(new Date(createdAt))}>
            {formatRelativeTime(createdAt)}
          </time>
          {!isRead && (
            <button type="button" className="notification__mark" onClick={handleMarkOnly}>
              Marcar como leída
              <span className="notification__sr"> la notificación de {actorName}</span>
            </button>
          )}
        </div>
      </div>
      {!isRead && <span className="notification__dot" aria-hidden="true" />}
    </li>
  )
}
