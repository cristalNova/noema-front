import type { AppNotification } from './Notification'

export const SYSTEM_ACTOR_NAME = 'Noema'

export interface NotificationContent {
  /** Quién la originó. */
  actorName: string
  /** Lo que hizo, redactado para ir justo después del nombre: "{actorName} {action}". */
  action: string
  /** A dónde lleva; null si el contenido no tiene una página propia. */
  href: string | null
}

function describeAction({ kind, target }: AppNotification): string {
  switch (kind) {
    case 'FOLLOW':
      return 'empezó a seguirte'
    case 'COMMENT':
      return target.type === 'POST' ? 'respondió a tu publicación' : 'te dejó un comentario'
    case 'REACTION':
      if (target.type === 'ARTICLE') return 'reaccionó a tu ensayo'
      if (target.type === 'POST') return 'reaccionó a tu publicación'
      if (target.type === 'COMMENT') return 'reaccionó a tu comentario'
      return 'reaccionó a tu contenido'
    case 'POST_IN_COMMUNITY':
      return 'publicó en una de tus comunidades'
    // Solicitud y aprobación comparten tipo y referencia: no se pueden distinguir desde aquí.
    case 'MEMBERSHIP':
      return 'tiene novedades sobre la membresía de una comunidad'
    case 'UNKNOWN':
      return 'tiene una novedad para ti'
  }
}

/** Un comentario no tiene página propia (vive dentro de un ensayo o una publicación). */
function describeHref({ target }: AppNotification): string | null {
  switch (target.type) {
    case 'PROFILE':
      return `/profiles/${target.id}`
    case 'ARTICLE':
      return `/articles/${target.id}`
    case 'POST':
      return `/posts/${target.id}`
    case 'COMMUNITY':
      return `/communities/${target.id}`
    case 'COMMENT':
    case 'UNKNOWN':
      return null
  }
}

export function describeNotification(notification: AppNotification): NotificationContent {
  return {
    actorName: notification.actor?.name ?? SYSTEM_ACTOR_NAME,
    action: describeAction(notification),
    href: describeHref(notification),
  }
}
