import { httpClient } from '../../../shared/api'

export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'BANNED'

export interface Membership {
  profileId: number
  communityId: number
  role: 'MEMBER' | 'MODERATOR' | 'OWNER'
  status: MembershipStatus
  joinedAt: string
}

export async function joinCommunity(communityId: number): Promise<Membership> {
  const response = await httpClient.post<Membership>(`/communities/${communityId}/members`)
  return response.data
}

export async function leaveCommunity(communityId: number): Promise<void> {
  await httpClient.delete(`/communities/${communityId}/members/me`)
}
