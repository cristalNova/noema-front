// DTOs: forma exacta del backend (GET /notifications).

export interface NotificationActorDto {
  id: number
  username: string
  name: string
  profilePhoto?: string | null
}

export interface NotificationDto {
  id: number
  recipientId: number
  actorId: number | null
  /** Perfil de quien originó la notificación; null si no hay (acciones del sistema). */
  actor?: NotificationActorDto | null
  type: string
  referenceType: string
  referenceId: number
  isRead: boolean
  createdAt: string
}
