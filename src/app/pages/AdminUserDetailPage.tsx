import { Link, useParams } from 'react-router-dom'
import { useAdminUser } from '@/features/admin/hooks/useAdminUser'
import { formatCreatedAt, roleNames } from '@/features/admin/model/users'

function AdminUserDetail({ id }: { id: number }) {
  const { user, isLoading, error, retry } = useAdminUser(id)

  return (
    <section className="admin-sheet" aria-busy={isLoading}>
      <Link className="back-link" to="/admin/users">← Usuarios</Link>

      {isLoading && <p className="status-message" role="status">Cargando usuario…</p>}
      {error && (
        <div className="status-message status-message--error" role="alert">
          <p>{error}</p>
          <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
        </div>
      )}

      {user && (
        <>
          <header className="admin-sheet__heading"><h2>{user.email}</h2></header>
          <dl className="admin-facts">
            <div><dt>Estado</dt><dd>{user.isActive ? 'Activo' : 'Inactivo'}</dd></div>
            <div><dt>Teléfono</dt><dd>{user.phoneNumber ?? 'Sin teléfono'}</dd></div>
            <div><dt>Roles</dt><dd>{roleNames(user).join(', ') || 'Sin roles'}</dd></div>
            <div><dt>Creado</dt><dd>{formatCreatedAt(user.createdAt)}</dd></div>
          </dl>
          {/* La HU de editar, desactivar y eliminar agrega aquí el formulario y las acciones. */}
        </>
      )}
    </section>
  )
}

export function AdminUserDetailPage() {
  const { id } = useParams()
  const userId = Number(id)
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return <p className="status-message status-message--error" role="alert">El identificador del usuario no es válido.</p>
  }
  return <AdminUserDetail id={userId} />
}