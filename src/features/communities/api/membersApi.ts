import { httpClient } from '../../../shared/api';
import type { Membership } from '../model/community.types';
import type { Paginated } from '../../../shared/types/Paginated'

export type { MembershipStatus } from '../model/community.types'

export async function joinCommunity(communityId: number): Promise<Membership> {
  const response = await httpClient.post<Membership>(`/communities/${communityId}/members`)
  return response.data
}

export async function listCommunityMembers(
  communityId: number,
  params: { page?: number; limit?: number; status?: Membership['status'] } = {},
): Promise<Paginated<Membership>> {
  const response = await httpClient.get<Paginated<Membership>>(
    `/communities/${communityId}/members`,
    { params },
  )
  return response.data
}

export async function getMyMembership(
  communityId: number,
  profileId: number,
): Promise<Membership | null> {
  for (const status of ['ACTIVE', 'PENDING', 'BANNED'] as const) {
    const response = await listCommunityMembers(communityId, {
      page: 1,
      limit: 100,
      status,
    })
    const membership = response.data.find((item) => item.profileId === profileId)
    if (membership) return membership
  }
  return null
}

export async function leaveCommunity(communityId: number): Promise<void> {
  await httpClient.delete(`/communities/${communityId}/members/me`)
}
