import { PERMISSIONS } from '@/features/auth'

export interface AdminSection {
  path: string
  label: string
  permission: string
}

/** Las siguientes HU agregan aquí Permisos y Roles (manage_roles) y Pagos (manage_payments). */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: '/admin/users', label: 'Usuarios', permission: PERMISSIONS.manageUsers },
  { path: '/admin/permissions', label: 'Permisos', permission: PERMISSIONS.manageRoles },
  { path: '/admin/roles', label: 'Roles', permission: PERMISSIONS.manageRoles },
  
]