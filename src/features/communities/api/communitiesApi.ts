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

export async function getCommunity(id: number) {
  const response = await httpClient.get<CommunityDetail>(`/communities/${id}`);
  return response.data;
}

export async function createCommunity(input: CreateCommunityDto): Promise<Community> {
  const response = await httpClient.post<Community>('/communities', input)
  return response.data
}

export async function listMyCommunityOptions(signal?: AbortSignal): Promise<Community[]> {
  const response = await httpClient.get<Paginated<Community>>('/communities/mine', {
    params: { page: 1, limit: 100 },
    signal,
  })
  return response.data.data
}
