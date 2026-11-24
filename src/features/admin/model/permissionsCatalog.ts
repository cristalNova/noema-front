import { PERMISSIONS } from '@/features/auth'
import type { AdminPermission } from '../api/permissionsApi'
import type { AdminRole } from '../api/rolesApi'

const SYSTEM_PERMISSIONS: readonly string[] = Object.values(PERMISSIONS)

/** Los que el panel y el back usan para dar acceso (manage_users, manage_roles, manage_payments). */
export function isSystemPermission(name: string): boolean {
  return SYSTEM_PERMISSIONS.includes(name)
}

export interface PermissionRow extends AdminPermission {
  /** Nombres de los roles que incluyen el permiso, en orden alfabético. */
  roles: string[]
}

/** El back no entrega los roles de cada permiso: se cruzan aquí con GET /roles. */
export function withRoles(permissions: AdminPermission[], roles: AdminRole[]): PermissionRow[] {
  return permissions.map((permission) => ({
    ...permission,
    roles: roles
      .filter((role) => role.rolePermissions.some((item) => item.permissionId === permission.id))
      .map((role) => role.roleName)
      .sort((a, b) => a.localeCompare(b)),
  }))
}

/** Devuelve el mensaje de error, o '' si el nombre es válido. */
export function validatePermissionName(value: string): string {
  const name = value.trim()
  if (!name) return 'El nombre del permiso es obligatorio.'
  if (name.length > 50) return 'El nombre no puede exceder 50 caracteres.'
  return ''
}