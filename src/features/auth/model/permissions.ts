import type { AuthUser } from './Session'

export const PERMISSIONS = {
  manageUsers: 'manage_users',
  manageRoles: 'manage_roles',
  managePayments: 'manage_payments',
} as const

export const ADMIN_PERMISSIONS: readonly string[] = Object.values(PERMISSIONS)

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  return user?.permissions.includes(permission) ?? false
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: readonly string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}