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

export interface CreatePlanInput {
  name: string
  price: number
  currency: string
  billingPeriod: BillingPeriod
  communityId?: number
}

export type UpdatePlanInput = Partial<Pick<Plan, 'name' | 'price' | 'isActive'>>

/** Los planes que administra el usuario, activos o no: los suyos y los de las comunidades que posee. */
export async function listAllMyPlans(signal?: AbortSignal): Promise<Plan[]> {
  const plans: Plan[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await httpClient.get<Paginated<Plan>>('/plans/mine', { params: { page, limit: 100 }, signal })
    plans.push(...data.data)
    if (data.data.length === 0 || page * data.limit >= data.total) return plans
  }
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const response = await httpClient.post<Plan>('/plans', input)
  return response.data
}

/** El backend solo admite cambiar el nombre, el precio y la activación. */
export async function updatePlan(id: number, input: UpdatePlanInput): Promise<Plan> {
  const response = await httpClient.patch<Plan>(`/plans/${id}`, input)
  return response.data
}

/** Responde 409 si el plan tiene suscripciones: en ese caso solo se puede desactivar. */
export async function deletePlan(id: number): Promise<void> {
  await httpClient.delete(`/plans/${id}`)
}
