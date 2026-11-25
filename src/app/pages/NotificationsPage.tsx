import { NotificationList, useNotifications } from '@/features/notifications'
import './NotificationsPage.css'

export function NotificationsPage() {
  const list = useNotifications()

  return (
    <main className="page-shell notifications-page">
      <header className="page-header">
        <p className="eyebrow">Noema · Actividad</p>
        <h1>Notificaciones</h1>
        <p>Nuevos seguidores, comentarios, reacciones y movimiento en tus comunidades.</p>
      </header>
      <section className="notifications-sheet" aria-label="Tus notificaciones" aria-busy={list.isLoading}>
        <NotificationList list={list} />
      </section>
    </main>
  )
}
