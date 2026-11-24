import { NavLink, Outlet } from 'react-router-dom'
import { hasPermission, useAuth } from '@/features/auth'
import { ADMIN_SECTIONS } from '@/features/admin/model/adminSections'
import './AdminLayout.css'

export function AdminLayout() {
  const { session } = useAuth()
  const sections = ADMIN_SECTIONS.filter((section) => hasPermission(session?.user, section.permission))

  return (
    <main className="page-shell admin-shell">
      <header className="page-header">
        <p className="eyebrow">Noema · Administración</p>
        <h1>Panel de administración</h1>
        <p>Supervisa a quienes usan la plataforma.</p>
      </header>

      <nav className="admin-nav" aria-label="Secciones de administración">
        {sections.map((section) => (
          <NavLink key={section.path} to={section.path}>{section.label}</NavLink>
        ))}
      </nav>

      <Outlet />
    </main>
  )
}