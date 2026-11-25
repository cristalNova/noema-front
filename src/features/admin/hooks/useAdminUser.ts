import { useEffect, useState } from 'react'
import { getUser, type AdminUser } from '../api/usersApi'
import { describeAdminError } from '../model/adminErrors'

interface Settled {
  key: string
  user: AdminUser | null
  error: string
}

export function useAdminUser(id: number) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${id}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    getUser(id, controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) setSettled({ key, user, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, user: null, error: describeAdminError(reason) })
      })
    return () => controller.abort()
  }, [id, key])

  const current = settled?.key === key ? settled : null
    /** Reemplaza el usuario en pantalla con la respuesta del servidor, sin volver a pedirlo. */
  const replaceUser = (next: AdminUser) => setSettled({ key, user: next, error: '' })
  return {
    user: current?.user ?? null,
    isLoading: current === null,
    error: current?.error ?? '',
    retry: () => setAttempt((value) => value + 1),
    replaceUser,
  }
}