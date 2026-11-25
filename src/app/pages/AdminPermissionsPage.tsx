import { useState } from 'react'
import { deletePermission, type AdminPermission } from '@/features/admin/api/permissionsApi'
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import { PermissionForm } from '@/features/admin/components/PermissionForm'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminPermissions'
import { describeAdminError } from '@/features/admin/model/adminErrors'
import { isSystemPermission, type PermissionRow } from '@/features/admin/model/permissionsCatalog'

export function AdminPermissionsPage() {
  const { permissions, isLoading, error, reload } = useAdminPermissions()
  const [editing, setEditing] = useState<AdminPermission | null>(null)
    const [toDelete, setToDelete] = useState<PermissionRow | null>(null)
  const [notice, setNotice] = useState('')

  function handleSaved(message: string) {
    setNotice(message)
    setEditing(null)
    reload()
  }

  async function confirmDelete(): Promise<string | null> {
    if (!toDelete) return null
    try {
      await deletePermission(toDelete.id)
      if (editing?.id === toDelete.id) setEditing(null)
      setNotice(`Permiso «${toDelete.permissionName}» eliminado.`)
      reload()
      return null
    } catch (reason) {
      return describeAdminError(reason)
    }
  }
    const deleteRoles = toDelete?.roles ?? []

  return (
    <section className="admin-sheet" aria-labelledby="admin-permissions-heading" aria-busy={isLoading}>
      <header className="admin-sheet__heading">
        <h2 id="admin-permissions-heading">Permisos</h2>
        {!isLoading && !error && (
          <span>{permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}</span>
        )}
      </header>

      <p className="admin-notice" role="status">{notice}</p>

      <section className="admin-form-section" aria-labelledby="permission-form-heading">
        <h3 id="permission-form-heading">
          {editing ? `Editar «${editing.permissionName}»` : 'Nuevo permiso'}
        </h3>
        <PermissionForm
          key={editing?.id ?? 'new'}
          permission={editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      </section>

      {isLoading && <p className="status-message" role="status">Cargando permisos…</p>}
      {error && (
        <div className="status-message status-message--error" role="alert">
          <p>{error}</p>
          <button type="button" className="button button--secondary" onClick={reload}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && permissions.length === 0 && (
        <p className="status-message">Todavía no hay permisos creados.</p>
      )}

      {!isLoading && !error && permissions.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption>Catálogo de permisos</caption>
            <thead>
              <tr>
                <th scope="col">Permiso</th>
                <th scope="col">Roles que lo incluyen</th>
                <th scope="col"><span className="admin-sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => {
                const roles = permission.roles
                return (
                  <tr key={permission.id}>
                    <td data-label="Permiso" className="admin-table__primary"><code>{permission.permissionName}</code></td>
                    <td data-label="Roles que lo incluyen">
                      {roles.length > 0 ? (
                        <ul className="admin-chips" aria-label={`Roles con ${permission.permissionName}`}>
                          {roles.map((roleName) => <li key={roleName}>{roleName}</li>)}
                        </ul>
                      ) : (
                        <span className="admin-muted">Ningún rol</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-link admin-link--button"
                          aria-label={`Editar ${permission.permissionName}`}
                          onClick={() => {
                            setNotice('')
                            setEditing(permission)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin-link admin-link--button admin-link--danger"
                          aria-label={`Eliminar ${permission.permissionName}`}
                          onClick={() => setToDelete(permission)}
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
        <ConfirmDialog
          title="¿Eliminar permiso?"
          confirmLabel="Eliminar definitivamente"
          busyLabel="Eliminando…"
          danger
          onClose={() => setToDelete(null)}
          onConfirm={confirmDelete}
        >
          <p><strong>{toDelete.permissionName}</strong></p>
          {deleteRoles.length > 0 ? (
            <p>
              Está incluido en {deleteRoles.length === 1 ? 'el rol' : 'los roles'}: <strong>{deleteRoles.join(', ')}</strong>.
              Al eliminarlo, {deleteRoles.length === 1 ? 'ese rol lo pierde' : 'esos roles lo pierden'}, y los usuarios
              con {deleteRoles.length === 1 ? 'ese rol' : 'esos roles'} dejan de tener lo que este permiso les permitía.
            </p>
          ) : (
            <p>Ningún rol usa este permiso.</p>
          )}
          {isSystemPermission(toDelete.permissionName) && (
            <p className="admin-warning" role="note">
              Este permiso lo usa el panel de administración. Eliminarlo puede dejar a todos sin acceso.
            </p>
          )}
          <p><strong>Eliminar es definitivo.</strong></p>
        </ConfirmDialog>
      )}
    </section>
  )
}