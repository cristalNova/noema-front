import type { Paginated } from '@/shared/types/Paginated'
import type { AppNotification, NotificationKind, NotificationTargetType } from './Notification'
import type { NotificationDto } from './notificationDto'

const KINDS: readonly NotificationKind[] = ['FOLLOW', 'COMMENT', 'REACTION', 'POST_IN_COMMUNITY', 'MEMBERSHIP']
const TARGETS: readonly NotificationTargetType[] = ['PROFILE', 'ARTICLE', 'POST', 'COMMENT', 'COMMUNITY']

/** Un tipo que el front aún no conoce no rompe la lista: cae en UNKNOWN. */
function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback
}

export function toNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto.id,
    kind: oneOf(dto.type, KINDS, 'UNKNOWN'),
    actor: dto.actor
      ? {
          id: dto.actor.id,
          name: dto.actor.name,
          username: dto.actor.username,
          photoUrl: dto.actor.profilePhoto ?? null,
        }
      : null,
    target: { type: oneOf(dto.referenceType, TARGETS, 'UNKNOWN'), id: dto.referenceId },
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  }
}

export function toNotificationPage(dto: Paginated<NotificationDto>): Paginated<AppNotification> {
  return { ...dto, data: dto.data.map(toNotification) }
}
