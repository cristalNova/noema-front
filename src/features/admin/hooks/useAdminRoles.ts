import { useCallback, useEffect, useState } from 'react'
import { listPermissions, type AdminPermission } from '../api/permissionsApi'
import { listRoles, type AdminRole } from '../api/rolesApi'
import { describeAdminError } from '../model/adminErrors'

interface Settled {
  roles: AdminRole[] | null
  permissions: AdminPermission[]
  error: string
}

export function useAdminRoles() {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([listRoles(controller.signal), listPermissions(controller.signal)])
      .then(([roles, permissions]) => {
        if (controller.signal.aborted) return
        setSettled({
          roles: [...roles].sort((a, b) => a.roleName.localeCompare(b.roleName)),
          permissions: [...permissions].sort((a, b) => a.permissionName.localeCompare(b.permissionName)),
          error: '',
        })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ roles: null, permissions: [], error: describeAdminError(reason) })
      })
    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    roles: settled?.roles ?? [],
    permissions: settled?.permissions ?? [],
    isLoading: settled === null,
    error: settled?.error ?? '',
    reload,
  }
}