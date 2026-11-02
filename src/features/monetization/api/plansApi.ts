import { httpClient } from '../../../shared/api';
import type { Paginated } from '../../../shared/types/Paginated';
import { toPageQuery } from '../../../shared/utils/pagination';

export interface Plan {
  id: number;
  communityId: number | null;
  name: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  isActive: boolean;
}

export interface PlanListParams {
  communityId?: number;
  page?: number;
  limit?: number;
}

export async function listPlans(params: PlanListParams = {}) {
  const { page, limit } = toPageQuery(params);
  const response = await httpClient.get<Paginated<Plan>>('/plans', {
    params: {
      page,
      limit,
      ...(params.communityId ? { communityId: params.communityId } : {}),
    },
  });
  return response.data;
}
