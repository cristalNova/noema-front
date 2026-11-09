import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'
import type { AppNotification } from '../model/Notification'
import type { NotificationDto } from '../model/notificationDto'
import { toNotificationPage } from '../model/notificationMappers'

// Pendiente (otras HU): GET /unread-count, POST /read-all, DELETE /:id

export const notificationsApi = {
  /** GET /notifications: las del usuario autenticado, de la más reciente a la más antigua. */
  async list(params: PaginationParams = {}, signal?: AbortSignal): Promise<Paginated<AppNotification>> {
    const { data } = await httpClient.get<Paginated<NotificationDto>>('/notifications', {
      params: toPageQuery(params),
      signal,
    })
    return toNotificationPage(data)
  },

  /**
   * PATCH /notifications/:id/read. Es idempotente. La respuesta no incluye el `actor`,
   * por eso no se mapea: quien llama solo necesita saber que salió bien.
   */
  async markAsRead(id: number): Promise<void> {
    await httpClient.patch(`/notifications/${id}/read`)
  },
}
