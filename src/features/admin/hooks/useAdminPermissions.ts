import { useCallback, useEffect, useState } from 'react'
import { listPermissions } from '../api/permissionsApi'
import { listRoles } from '../api/rolesApi'
import { describeAdminError } from '../model/adminErrors'
import { withRoles, type PermissionRow } from '../model/permissionsCatalog'

interface Settled {
  permissions: PermissionRow[] | null
  error: string
}

export function useAdminPermissions() {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([listPermissions(controller.signal), listRoles(controller.signal)])
      .then(([permissions, roles]) => {
        if (controller.signal.aborted) return
        const rows = withRoles(permissions, roles).sort((a, b) => a.permissionName.localeCompare(b.permissionName))
        setSettled({ permissions: rows, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ permissions: null, error: describeAdminError(reason) })
      })
    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    permissions: settled?.permissions ?? [],
    isLoading: settled === null,
    error: settled?.error ?? '',
    reload,
  }
}