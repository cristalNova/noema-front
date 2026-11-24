import type { AdminUser } from '../api/usersApi'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export function formatCreatedAt(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function roleNames(user: AdminUser): string[] {
  return user.userRoles.map((userRole) => userRole.role.roleName)
}