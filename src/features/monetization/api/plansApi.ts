import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'

export type BillingPeriod = 'MONTHLY' | 'YEARLY'

// Un plan pertenece a un autor o a una comunidad, nunca a ambos.
export interface Plan {
  id: number
  authorId: number | null
  communityId: number | null
  name: string
  price: number
  currency: string
  billingPeriod: BillingPeriod
  isActive: boolean
}

export interface PlanListParams extends PaginationParams {
  authorId?: number
  communityId?: number
}

export async function listPlans(params: PlanListParams = {}, signal?: AbortSignal): Promise<Paginated<Plan>> {
  const response = await httpClient.get<Paginated<Plan>>('/plans', {
    params: {
      ...toPageQuery(params),
      ...(params.authorId ? { authorId: params.authorId } : {}),
      ...(params.communityId ? { communityId: params.communityId } : {}),
    },
    signal,
  })
  return response.data
}

/**
 * Todos los planes que un lector puede ver. El backend ya excluye los inactivos;
 * se filtra también aquí porque mostrar uno llevaría a un cobro que sería rechazado.
 */
export async function listActivePlans(
  owner: Pick<PlanListParams, 'authorId' | 'communityId'>,
  signal?: AbortSignal,
): Promise<Plan[]> {
  const plans: Plan[] = []
  for (let page = 1; ; page += 1) {
    const result = await listPlans({ ...owner, page, limit: 100 }, signal)
    plans.push(...result.data.filter((plan) => plan.isActive))
    if (result.data.length === 0 || page * result.limit >= result.total) return plans
  }
}
