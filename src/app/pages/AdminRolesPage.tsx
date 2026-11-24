import { useState } from 'react'
import { deleteRole, type AdminRole } from '@/features/admin/api/rolesApi'
import { RoleDeleteDialog } from '@/features/admin/components/RoleDeleteDialog'
import { RoleForm } from '@/features/admin/components/RoleForm'
import { useAdminRoles } from '@/features/admin/hooks/useAdminRoles'
import { describeAdminError } from '@/features/admin/model/adminErrors'
import { permissionNames } from '@/features/admin/model/rolesCatalog'

export function AdminRolesPage() {
  const { roles, permissions, isLoading, error, reload } = useAdminRoles()
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const [toDelete, setToDelete] = useState<AdminRole | null>(null)
  const [notice, setNotice] = useState('')

  function handleSaved(message: string) {
    setNotice(message)
    setEditing(null)
    reload()
  }

  async function confirmDelete(): Promise<string | null> {
    if (!toDelete) return null
    try {
      await deleteRole(toDelete.id)
      if (editing?.id === toDelete.id) setEditing(null)
      setNotice(`Rol «${toDelete.roleName}» eliminado.`)
      reload()
      return null
    } catch (reason) {
      return describeAdminError(reason) // si el servidor rechaza porque está en uso, se muestra aquí
    }
  }

  return (
    <section className="admin-sheet" aria-labelledby="admin-roles-heading" aria-busy={isLoading}>
      <header className="admin-sheet__heading">
        <h2 id="admin-roles-heading">Roles</h2>
        {!isLoading && !error && <span>{roles.length} {roles.length === 1 ? 'rol' : 'roles'}</span>}
      </header>

      <p className="admin-notice" role="status">{notice}</p>

      {!isLoading && !error && (
        <section className="admin-form-section" aria-labelledby="role-form-heading">
          <h3 id="role-form-heading">{editing ? `Editar «${editing.roleName}»` : 'Nuevo rol'}</h3>
          <RoleForm
            key={editing?.id ?? 'new'}
            role={editing}
            permissions={permissions}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}

      {isLoading && <p className="status-message" role="status">Cargando roles…</p>}
      {error && (
        <div className="status-message status-message--error" role="alert">
          <p>{error}</p>
          <button type="button" className="button button--secondary" onClick={reload}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && roles.length === 0 && <p className="status-message">Todavía no hay roles creados.</p>}

      {!isLoading && !error && roles.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption>Roles de la plataforma</caption>
            <thead>
              <tr>
                <th scope="col">Rol</th>
                <th scope="col">Permisos</th>
                <th scope="col"><span className="admin-sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const names = permissionNames(role)
                return (
                  <tr key={role.id}>
                    <td><strong>{role.roleName}</strong></td>
                    <td>
                      {names.length > 0 ? (
                        <ul className="admin-chips" aria-label={`Permisos de ${role.roleName}`}>
                          {names.map((name) => <li key={name}>{name}</li>)}
                        </ul>
                      ) : (
                        <span className="admin-muted">Sin permisos</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-link admin-link--button"
                          aria-label={`Editar ${role.roleName}`}
                          onClick={() => {
                            setNotice('')
                            setEditing(role)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin-link admin-link--button admin-link--danger"
                          aria-label={`Eliminar ${role.roleName}`}
                          onClick={() => setToDelete(role)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toDelete && (
        <RoleDeleteDialog key={toDelete.id} role={toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} />
      )}
    </section>
  )
}