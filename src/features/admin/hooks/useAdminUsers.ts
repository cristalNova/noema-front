import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paginate, readPageParam } from '@/shared/utils/pagination'
import { listUsers, type AdminUser } from '../api/usersApi'
import { describeAdminError } from '../model/adminErrors'

export const USERS_PAGE_SIZE = 10

interface Settled {
  attempt: number
  users: AdminUser[] | null
  error: string
}

/** Lista de usuarios paginada en el cliente, con la página en la URL (`?page=`). */
export function useAdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPage = readPageParam(searchParams)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listUsers(controller.signal)
      .then((users) => {
        if (!controller.signal.aborted) setSettled({ attempt, users, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ attempt, users: null, error: describeAdminError(reason) })
      })
    return () => controller.abort()
  }, [attempt])

  const setPage = useCallback((next: number) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
      return params
    })
  }, [setSearchParams])

  const current = settled?.attempt === attempt ? settled : null
  // Los más recientes primero.
  const sorted = current?.users ? [...current.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const result = paginate(sorted, requestedPage, USERS_PAGE_SIZE)

  return {
    users: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    isLoading: current === null,
    error: current?.error ?? '',
    setPage,
    retry: () => setAttempt((value) => value + 1),
  }
}