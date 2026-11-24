import type { AdminRole } from '../api/rolesApi'

/** Devuelve el mensaje de error, o '' si el nombre es válido. */
export function validateRoleName(value: string): string {
  const name = value.trim()
  if (!name) return 'El nombre del rol es obligatorio.'
  if (name.length > 50) return 'El nombre no puede exceder 50 caracteres.'
  return ''
}

export function permissionNames(role: AdminRole): string[] {
  return role.rolePermissions
    .map((item) => item.permission.permissionName)
    .sort((a, b) => a.localeCompare(b))
}

export function permissionIdsOf(role: AdminRole): number[] {
  return role.rolePermissions.map((item) => item.permissionId)
}

export function sameIds(a: Iterable<number>, b: Iterable<number>): boolean {
  const left = new Set(a)
  const right = new Set(b)
  return left.size === right.size && Array.from(left).every((id) => right.has(id))
}