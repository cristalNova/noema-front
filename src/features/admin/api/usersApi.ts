import { httpClient } from '@/shared/api'

export interface AdminUser {
  id: number
  email: string
  phoneNumber: string | null
  isActive: boolean
  createdAt: string
  userRoles: { roleId: number; role: { id: number; roleName: string } }[]
}

/** GET /users (requiere manage_users). El backend la entrega completa, sin paginar. */
export async function listUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  const response = await httpClient.get<AdminUser[]>('/users', { signal })
  return response.data
}

/** GET /users/:id */
export async function getUser(id: number, signal?: AbortSignal): Promise<AdminUser> {
  const response = await httpClient.get<AdminUser>(`/users/${id}`, { signal })
  return response.data
}