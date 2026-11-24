import { httpClient } from '@/shared/api'

export interface AdminPermission {
  id: number
  permissionName: string

}

/** GET /permissions (requiere manage_roles). Incluye los roles que usan cada permiso. */
export async function listPermissions(signal?: AbortSignal): Promise<AdminPermission[]> {
  const response = await httpClient.get<AdminPermission[]>('/permissions', { signal })
  return response.data
}

/** POST /permissions. Responde 409 si el nombre ya existe. */
export async function createPermission(permissionName: string): Promise<AdminPermission> {
  const response = await httpClient.post<AdminPermission>('/permissions', { permissionName })
  return response.data
}

/** PATCH /permissions/:id. Responde 409 si el nombre ya existe. */
export async function updatePermission(id: number, permissionName: string): Promise<AdminPermission> {
  const response = await httpClient.patch<AdminPermission>(`/permissions/${id}`, { permissionName })
  return response.data
}

/** DELETE /permissions/:id (204). Los roles que lo incluían lo pierden. */
export async function deletePermission(id: number): Promise<void> {
  await httpClient.delete(`/permissions/${id}`)
}