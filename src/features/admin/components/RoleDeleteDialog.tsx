import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth'
import type { AdminRole } from '../api/rolesApi'
import { listUsers } from '../api/usersApi'
import { isSystemPermission } from '../model/permissionsCatalog'
import { permissionNames } from '../model/rolesCatalog'
import { ConfirmDialog } from './ConfirmDialog'

type Usage = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; emails: string[] }

const MAX_LISTED = 5

interface RoleDeleteDialogProps {
  role: AdminRole
  onClose: () => void
  /** Devuelve un mensaje de error, o null si la eliminación terminó bien. */
  onConfirm: () => Promise<string | null>
}

export function RoleDeleteDialog({ role, onClose, onConfirm }: RoleDeleteDialogProps) {
  const { session } = useAuth()
  const [usage, setUsage] = useState<Usage>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    listUsers(controller.signal)
      .then((users) => {
        if (controller.signal.aborted) return
        const emails = users
          .filter((user) => user.userRoles.some((userRole) => userRole.roleId === role.id))
          .map((user) => user.email)
        setUsage({ status: 'ready', emails })
      })
      .catch(() => {
        if (!controller.signal.aborted) setUsage({ status: 'unavailable' })
      })
    return () => controller.abort()
  }, [role.id])

  const isMine = session?.user.roles.includes(role.roleName) ?? false
  const hasPanelPermissions = permissionNames(role).some(isSystemPermission)

  return (
    <ConfirmDialog
      title="¿Eliminar rol?"
      confirmLabel="Eliminar definitivamente"
      busyLabel="Eliminando…"
      danger
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p><strong>{role.roleName}</strong></p>

      {usage.status === 'loading' && <p>Revisando qué usuarios tienen este rol…</p>}
      {usage.status === 'unavailable' && (
        <p>
          No se pudo comprobar si hay usuarios con este rol (hace falta el permiso de gestión de usuarios).
          Si los hay, lo perderán.
        </p>
      )}
      {usage.status === 'ready' && usage.emails.length === 0 && <p>Ningún usuario tiene este rol.</p>}
      {usage.status === 'ready' && usage.emails.length > 0 && (
        <p>
          Lo tienen {usage.emails.length} {usage.emails.length === 1 ? 'usuario' : 'usuarios'}:{' '}
          <strong>{usage.emails.slice(0, MAX_LISTED).join(', ')}</strong>
          {usage.emails.length > MAX_LISTED && ` y ${usage.emails.length - MAX_LISTED} más`}.
          Al eliminarlo, lo pierden.
        </p>
      )}

      {isMine && (
        <p className="admin-warning" role="note">Es uno de tus roles: perderías lo que te permite.</p>
      )}
      {hasPanelPermissions && (
        <p className="admin-warning" role="note">
          Este rol incluye permisos del panel de administración. Eliminarlo puede dejar a esos usuarios sin acceso.
        </p>
      )}
      <p><strong>Eliminar es definitivo.</strong></p>
    </ConfirmDialog>
  )
}