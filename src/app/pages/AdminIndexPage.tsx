import { Navigate } from 'react-router-dom'
import { AccessDenied, hasPermission, useAuth } from '@/features/auth'
import { ADMIN_SECTIONS } from '@/features/admin/model/adminSections'

/** /admin lleva a la primera sección que el usuario puede ver. */
export function AdminIndexPage() {
  const { session } = useAuth()
  const section = ADMIN_SECTIONS.find((item) => hasPermission(session?.user, item.permission))
  return section ? <Navigate to={section.path} replace /> : <AccessDenied />
}