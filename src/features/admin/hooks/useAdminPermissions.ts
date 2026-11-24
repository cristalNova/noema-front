import { useCallback, useEffect, useState } from 'react'
import { listPermissions, type AdminPermission } from '../api/permissionsApi'
import { describeAdminError } from '../model/adminErrors'

interface Settled {
  permissions: AdminPermission[] | null
  error: string
}

export function useAdminPermissions() {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listPermissions(controller.signal)
      .then((permissions) => {
        if (!controller.signal.aborted) setSettled({ permissions, error: '' })
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