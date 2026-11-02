import { httpClient } from '../../../shared/api'
import type { Paginated } from '../../../shared/types/Paginated'
import { toPageQuery } from '../../../shared/utils/pagination'
import type { Community } from '../model/community.types'

export interface CommunityListParams {
  page?: number
  limit?: number
  topic?: string
  tag?: string
  search?: string
}

export async function listCommunities(params: CommunityListParams = {}) {
  const { page, limit } = toPageQuery(params)
  const response = await httpClient.get<Paginated<Community>>('/communities', {
    params: {
      page,
      limit,
      ...(params.topic?.trim() ? { topic: params.topic.trim() } : {}),
      ...(params.tag?.trim() ? { tag: params.tag.trim() } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    },
  })
  return response.data
}

export async function getCommunity(id: number) {
  const response = await httpClient.get<Community>(`/communities/${id}`)
  return response.data
}

/** /mine devuelve membresías activas, con la comunidad anidada. */
export async function listMyCommunityOptions(signal?: AbortSignal): Promise<Community[]> {
  const communities: Community[] = []
  let page = 1
  let total: number
  do {
    const response = await httpClient.get<Paginated<{ community: Community }>>('/communities/mine', {
      params: { page, limit: 100 },
      signal,
    })
    communities.push(...response.data.data.map((membership) => membership.community))
    total = response.data.total
    if (response.data.data.length === 0) break
    page += 1
  } while (communities.length < total)
  return communities
}
