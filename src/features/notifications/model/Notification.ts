// Se llama AppNotification para no chocar con la API global `Notification` del navegador.

export type NotificationKind =
  | 'FOLLOW'
  | 'COMMENT'
  | 'REACTION'
  | 'POST_IN_COMMUNITY'
  | 'MEMBERSHIP'
  | 'UNKNOWN'

export type NotificationTargetType = 'PROFILE' | 'ARTICLE' | 'POST' | 'COMMENT' | 'COMMUNITY' | 'UNKNOWN'

export interface NotificationActor {
  id: number
  name: string
  username: string
  photoUrl: string | null
}

export interface AppNotification {
  id: number
  kind: NotificationKind
  actor: NotificationActor | null
  target: { type: NotificationTargetType; id: number }
  isRead: boolean
  /** ISO 8601. */
  createdAt: string
}
