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