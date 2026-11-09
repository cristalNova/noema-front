import { Pagination } from '@/shared/components/Pagination'
import type { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import './NotificationList.css'

interface NotificationListProps {
  list: ReturnType<typeof useNotifications>
}

export function NotificationList({ list }: NotificationListProps) {
  const { notifications, total, limit, page, isLoading, error, setPage, reload } = list

  if (isLoading) {
    return (
      <p className="status-message" role="status">
        Cargando notificaciones…
      </p>
    )
  }

  if (error) {
    return (
      <div className="notification-state" role="alert">
        <h3>No pudimos cargar tus notificaciones</h3>
        <p>{error}</p>
        <button type="button" className="button button--secondary" onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="notification-state">
        <h3>Todo al día.</h3>
        <p>
          Cuando alguien te siga, comente, reaccione o haya actividad en tus comunidades, lo verás
          aquí.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="notification-list" aria-label="Notificaciones">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </ul>
      <Pagination page={page} total={total} limit={limit} label="Paginación de notificaciones" onPageChange={setPage} />
    </>
  )
}
