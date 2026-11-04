import { httpClient } from '../../../shared/api'
import type { Paginated } from '../../../shared/types/Paginated'
import { toPageQuery } from '../../../shared/utils/pagination'
import type { Community, CommunityDetail, CreateCommunityDto } from '../model/community.types'

export interface CommunityListParams {
  page?: number;
  limit?: number;
  topic?: string;
  tag?: string;
  search?: string;
}

export async function listCommunities(params: CommunityListParams = {}) {
  const { page, limit } = toPageQuery(params);
  const response = await httpClient.get<Paginated<Community>>('/communities', {
    params: {
      page,
      limit,
      ...(params.topic?.trim() ? { topic: params.topic.trim() } : {}),
      ...(params.tag?.trim() ? { tag: params.tag.trim() } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    },
  });
  return response.data;
}

export async function getCommunity(id: number, signal?: AbortSignal) {
  const response = await httpClient.get<CommunityDetail>(`/communities/${id}`, { signal });
  return response.data;
}

export async function createCommunity(input: CreateCommunityDto): Promise<Community> {
  const response = await httpClient.post<Community>('/communities', input)
  return response.data
}

export interface CommunityOption {
  id: number
  name: string
}

// GET /communities/mine devuelve membresías con la comunidad anidada, no comunidades.
export async function listMyCommunityFilterOptions(signal?: AbortSignal): Promise<CommunityOption[]> {
  const communities = new Map<number, CommunityOption>()
  let page = 1
  let received = 0
  let total: number
  do {
    const response = await httpClient.get<Paginated<{ community?: Community }>>('/communities/mine', {
      params: { page, limit: 100 }, signal,
    })
    for (const { community } of response.data.data) {
      if (community) communities.set(community.id, { id: community.id, name: community.name })
    }
    received += response.data.data.length
    total = response.data.total
    if (response.data.data.length === 0) break
    page += 1
  } while (received < total)
  return [...communities.values()]
}

export interface OwnedCommunity extends CommunityOption {
  isPremium: boolean
}

/** Comunidades de las que el usuario es propietario: el resto de membresías no permiten crear planes. */
export async function listMyOwnedCommunities(signal?: AbortSignal): Promise<OwnedCommunity[]> {
  const communities: OwnedCommunity[] = []
  for (let page = 1; ; page += 1) {
    const { data } = await httpClient.get<Paginated<{ role?: string; community?: Community }>>('/communities/mine', {
      params: { page, limit: 100 }, signal,
    })
    for (const { role, community } of data.data) {
      if (role === 'OWNER' && community) communities.push({ id: community.id, name: community.name, isPremium: community.isPremium })
    }
    if (data.data.length === 0 || page * data.limit >= data.total) return communities
  }
}
