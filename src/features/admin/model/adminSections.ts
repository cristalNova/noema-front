import { PERMISSIONS } from '@/features/auth'

export interface AdminSection {
  path: string
  label: string
  permission: string
}

/** Secciones del panel; cada una solo se muestra a quien tiene su permiso. */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: '/admin/users', label: 'Usuarios', permission: PERMISSIONS.manageUsers },
  { path: '/admin/permissions', label: 'Permisos', permission: PERMISSIONS.manageRoles },
  { path: '/admin/roles', label: 'Roles', permission: PERMISSIONS.manageRoles },
  { path: '/admin/payments', label: 'Pagos', permission: PERMISSIONS.managePayments },
]