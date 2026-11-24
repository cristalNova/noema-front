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

export interface UpdateUserInput {
  email?: string
  /** `null` borra el teléfono. */
  phoneNumber?: string | null
  isActive?: boolean
}

/** PATCH /users/:id. Responde 409 si el correo ya está registrado. */
export async function updateUser(id: number, input: UpdateUserInput): Promise<AdminUser> {
  const response = await httpClient.patch<AdminUser>(`/users/${id}`, input)
  return response.data
}

/** DELETE /users/:id (204). Es definitivo. */
export async function deleteUser(id: number): Promise<void> {
  await httpClient.delete(`/users/${id}`)
}