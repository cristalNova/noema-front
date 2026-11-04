import { useEffect, useState } from 'react'
import { getCommunity } from '@/features/communities/api/communitiesApi'
import { profilesApi } from '@/features/profiles'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { listActivePlans, type Plan } from '../api/plansApi'
import type { PlanOwner } from '../model/plans'

interface Settled {
  attempt: number
  ownerName: string
  plans: Plan[]
  error: string
  isUnavailable: boolean
}

async function loadOwnerName({ kind, id }: PlanOwner, signal: AbortSignal): Promise<string> {
  const owner = kind === 'community' ? await getCommunity(id, signal) : await profilesApi.getById(id, signal)
  return owner.name
}

function loadPlans({ kind, id }: PlanOwner, signal: AbortSignal): Promise<Plan[]> {
  return listActivePlans(kind === 'community' ? { communityId: id } : { authorId: id }, signal)
}

/** Planes activos y nombre de su titular. Quien la usa debe remontarla al cambiar de titular. */
export function usePlanCatalog(owner: PlanOwner) {
  const { kind, id } = owner
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const target = { kind, id }
    Promise.all([loadOwnerName(target, controller.signal), loadPlans(target, controller.signal)])
      .then(([ownerName, plans]) => {
        if (!controller.signal.aborted) setSettled({ attempt, ownerName, plans, error: '', isUnavailable: false })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, ownerName: '', plans: [], error: getErrorMessage(reason), isUnavailable: toApiError(reason).status === 404 })
      })
    return () => controller.abort()
  }, [kind, id, attempt])

  const current = settled?.attempt === attempt ? settled : null
  return {
    ownerName: current?.ownerName ?? '',
    plans: current?.plans ?? [],
    error: current?.error ?? '',
    isUnavailable: current?.isUnavailable ?? false,
    isLoading: current === null,
    retry: () => setAttempt((value) => value + 1),
  }
}
