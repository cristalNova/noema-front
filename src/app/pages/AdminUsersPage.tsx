import { Link, useLocation } from 'react-router-dom'
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers'
import { formatCreatedAt } from '@/features/admin/model/users'
import { Pagination } from '@/shared/components/Pagination'

function savedNotice(state: unknown): string {
  return state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string' ? state.notice : ''
}

export function AdminUsersPage() {
  const { users, total, page, limit, isLoading, error, setPage, retry } = useAdminUsers()

  const location = useLocation()
const notice = savedNotice(location.state)  

  return (
    <section className="admin-sheet" aria-labelledby="admin-users-heading" aria-busy={isLoading}>
      <header className="admin-sheet__heading">
        <p className="admin-notice" role="status">{notice}</p>
        <h2 id="admin-users-heading">Usuarios</h2>
        {!isLoading && !error && <span>{total} {total === 1 ? 'usuario' : 'usuarios'}</span>}
      </header>

      {isLoading && <p className="status-message" role="status">Cargando usuarios…</p>}
      {error && (
        <div className="status-message status-message--error" role="alert">
          <p>{error}</p>
          <button type="button" className="button button--secondary" onClick={retry}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && users.length === 0 && <p className="status-message">Todavía no hay usuarios registrados.</p>}

      {!isLoading && !error && users.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption>Usuarios de la plataforma</caption>
              <thead>
                <tr>
                  <th scope="col">Correo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha de creación</th>
                  <th scope="col"><span className="admin-sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <span className={`admin-status admin-status--${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td><time dateTime={user.createdAt}>{formatCreatedAt(user.createdAt)}</time></td>
                    <td>
                      <Link className="admin-link" to={`/admin/users/${user.id}`} aria-label={`Ver detalle de ${user.email}`}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <Pagination page={page} total={total} limit={limit} label="Paginación de usuarios" onPageChange={setPage} />
          )}
        </>
      )}
    </section>
  )
}