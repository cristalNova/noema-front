import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/shared/utils/relativeTime'
import type { AppNotification } from '../model/Notification'
import { describeNotification } from '../model/notificationContent'
import './NotificationItem.css'

interface NotificationItemProps {
  notification: AppNotification
}

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' })

export function NotificationItem({ notification }: NotificationItemProps) {
  const { actor, isRead, createdAt } = notification
  const { actorName, action, href } = describeNotification(notification)

  const message = (
    <>
      <strong>{actorName}</strong> {action}
    </>
  )

  return (
    <li className={`notification ${isRead ? 'notification--read' : 'notification--unread'}`}>
      <span className="notification__avatar" aria-hidden="true">
        {actor?.photoUrl ? <img src={actor.photoUrl} alt="" /> : actorName.charAt(0).toUpperCase()}
      </span>
      <div className="notification__body">
        <p className="notification__text">
          {/* El color no basta para distinguir: el estado también se anuncia con texto. */}
          {!isRead && <span className="notification__sr">No leída. </span>}
          {href ? <Link to={href}>{message}</Link> : message}
        </p>
        <time className="notification__time" dateTime={createdAt} title={dateFormat.format(new Date(createdAt))}>
          {formatRelativeTime(createdAt)}
        </time>
      </div>
      {!isRead && <span className="notification__dot" aria-hidden="true" />}
    </li>
  )
}
