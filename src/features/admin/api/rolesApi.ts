import { httpClient } from '@/shared/api'

export interface AdminRole {
  id: number
  roleName: string
  rolePermissions: { roleId: number; permissionId: number; permission: { id: number; permissionName: string } }[]
}

/** GET /roles (requiere manage_roles). Cada rol trae sus permisos. */
export async function listRoles(signal?: AbortSignal): Promise<AdminRole[]> {
  const response = await httpClient.get<AdminRole[]>('/roles', { signal })
  return response.data
}
export interface RoleInput {
  roleName?: string
  /** Reemplaza todos los permisos del rol por los indicados. */
  permissionIds?: number[]
}

/** POST /roles. Responde 409 si el nombre ya existe. */
export async function createRole(input: RoleInput): Promise<AdminRole> {
  const response = await httpClient.post<AdminRole>('/roles', input)
  return response.data
}

/** PATCH /roles/:id. Responde 409 si el nombre ya existe. */
export async function updateRole(id: number, input: RoleInput): Promise<AdminRole> {
  const response = await httpClient.patch<AdminRole>(`/roles/${id}`, input)
  return response.data
}

/** DELETE /roles/:id (204). */
export async function deleteRole(id: number): Promise<void> {
  await httpClient.delete(`/roles/${id}`)
}