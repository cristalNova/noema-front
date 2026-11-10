import { httpClient } from '@/shared/api'
import type { Paginated, PaginationParams } from '@/shared/types/Paginated'
import { toPageQuery } from '@/shared/utils/pagination'
import { toMyCommunity, type MyCommunity, type MyCommunityDto } from '../model/myCommunity'

/** GET /communities/mine (requiere JWT y perfil): mis membresías activas, la más reciente primero. */
export async function listMyCommunities(
  params: PaginationParams = {},
  signal?: AbortSignal,
): Promise<Paginated<MyCommunity>> {
  const { data } = await httpClient.get<Paginated<MyCommunityDto>>('/communities/mine', {
    params: toPageQuery(params),
    signal,
  })
  const communities = data.data.map(toMyCommunity).filter((item): item is MyCommunity => item !== null)
  return { ...data, data: communities }
}
