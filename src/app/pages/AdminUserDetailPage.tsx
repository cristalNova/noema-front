import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { deleteUser, updateUser } from '@/features/admin/api/usersApi'
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog'
import { UserEditForm } from '@/features/admin/components/UserEditForm'
import { useAdminUser } from '@/features/admin/hooks/useAdminUser'
import { describeAdminError } from '@/features/admin/model/adminErrors'
import { formatCreatedAt, roleNames } from '@/features/admin/model/users'

type PendingAction = 'activate' | 'deactivate' | 'delete' | null

function AdminUserDetail({ id }: { id: number }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { user, isLoading, error, retry, replaceUser } = useAdminUser(id)
  const [pending, setPending] = useState<PendingAction>(null)

  // session.user.id es string; AdminUser.id es number.
  const isSelf = user !== null && Number(session?.user.id) === user.id

  async function confirmToggle(): Promise<string | null> {
    if (!user || isSelf) return 'No puedes desactivarte a ti mismo.'
    try {
      replaceUser(await updateUser(user.id, { isActive: pending === 'activate' }))
      return null
    } catch (reason) {
      return describeAdminError(reason)
    }
  }

  async function confirmDelete(): Promise<string | null> {
    if (!user || isSelf) return 'No puedes eliminarte a ti mismo.'
    try {
      await deleteUser(user.id)
      // La lista se vuelve a pedir al montarse, así que ya no incluye al usuario eliminado.
      navigate('/admin/users', {
        replace: true,
        state: { notice: `El usuario ${user.email} fue eliminado correctamente.` },
      })
      return null
    } catch (reason) {
      return describeAdminError(reason)
    }
  }

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
            <div><dt>Teléfono</dt><dd>{user.phoneNumber || 'Sin teléfono'}</dd></div>
            <div><dt>Roles</dt><dd>{roleNames(user).join(', ') || 'Sin roles'}</dd></div>
            <div><dt>Creado</dt><dd>{formatCreatedAt(user.createdAt)}</dd></div>
          </dl>

          <section className="admin-section" aria-labelledby="user-edit-heading">
            <h3 id="user-edit-heading">Editar datos</h3>
            <UserEditForm user={user} onSaved={replaceUser} />
          </section>

          <section className="admin-section" aria-labelledby="user-actions-heading">
            <h3 id="user-actions-heading">Estado y eliminación</h3>
            {isSelf && (
              <p className="admin-hint">Esta es tu propia cuenta: no puedes desactivarla ni eliminarla desde aquí.</p>
            )}
            <div className="admin-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={isSelf}
                onClick={() => setPending(user.isActive ? 'deactivate' : 'activate')}
              >
                {user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
              </button>
              <button type="button" className="button admin-danger" disabled={isSelf} onClick={() => setPending('delete')}>
                Eliminar usuario
              </button>
            </div>
          </section>

          {(pending === 'activate' || pending === 'deactivate') && (
            <ConfirmDialog
              title={pending === 'deactivate' ? '¿Desactivar usuario?' : '¿Activar usuario?'}
              confirmLabel={pending === 'deactivate' ? 'Desactivar' : 'Activar'}
              busyLabel="Procesando…"
              onClose={() => setPending(null)}
              onConfirm={confirmToggle}
            >
              <p><strong>{user.email}</strong></p>
              <p>
                {pending === 'deactivate'
                  ? 'No podrá iniciar sesión y su sesión actual dejará de funcionar. Puedes volver a activarlo cuando quieras.'
                  : 'Podrá volver a iniciar sesión.'}
              </p>
            </ConfirmDialog>
          )}

          {pending === 'delete' && (
            <ConfirmDialog
              title="¿Eliminar usuario?"
              confirmLabel="Eliminar definitivamente"
              busyLabel="Eliminando…"
              danger
              onClose={() => setPending(null)}
              onConfirm={confirmDelete}
            >
              <p><strong>{user.email}</strong></p>
              <p><strong>Eliminar es definitivo:</strong> la cuenta y sus datos no se pueden recuperar. Si solo quieres impedir que acceda, desactívalo en su lugar.</p>
            </ConfirmDialog>
          )}
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