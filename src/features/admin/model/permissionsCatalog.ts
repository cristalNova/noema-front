import { PERMISSIONS } from '@/features/auth'
import type { AdminPermission } from '../api/permissionsApi'

const SYSTEM_PERMISSIONS: readonly string[] = Object.values(PERMISSIONS)

/** Los que el panel y el back usan para dar acceso (manage_users, manage_roles, manage_payments). */
export function isSystemPermission(name: string): boolean {
  return SYSTEM_PERMISSIONS.includes(name)
}

export function rolesUsing(permission: AdminPermission): string[] {
  return (permission.rolePermissions ?? []).map((item) => item.role.roleName)
}

/** Devuelve el mensaje de error, o '' si el nombre es válido. */
export function validatePermissionName(value: string): string {
  const name = value.trim()
  if (!name) return 'El nombre del permiso es obligatorio.'
  if (name.length > 50) return 'El nombre no puede exceder 50 caracteres.'
  return ''
}