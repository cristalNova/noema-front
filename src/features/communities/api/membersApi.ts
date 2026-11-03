import { httpClient } from '../../../shared/api';
import { toApiError } from '../../../shared/api/apiError';
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

const MEMBERS_SCAN_LIMIT = 100

/** Recorre todas las páginas de un estado hasta encontrar el perfil. */
async function findProfileInStatus(
  communityId: number,
  profileId: number,
  status: Membership['status'],
): Promise<Membership | null> {
  for (let page = 1; ; page += 1) {
    const response = await listCommunityMembers(communityId, {
      page,
      limit: MEMBERS_SCAN_LIMIT,
      status,
    })
    const membership = response.data.find((item) => item.profileId === profileId)
    if (membership) return membership
    if (response.data.length === 0 || page * MEMBERS_SCAN_LIMIT >= response.total) return null
  }
}

export async function getMyMembership(
  communityId: number,
  profileId: number,
): Promise<Membership | null> {
  const active = await findProfileInStatus(communityId, profileId, 'ACTIVE')
  if (active) return active

  // El backend solo deja listar PENDING y BANNED a propietario y moderadores (403 para el resto):
  // un miembro común no puede consultarlos aquí, así que ese error significa "no se sabe", no "no es miembro".
  for (const status of ['PENDING', 'BANNED'] as const) {
    try {
      const membership = await findProfileInStatus(communityId, profileId, status)
      if (membership) return membership
    } catch (error) {
      const { status: httpStatus } = toApiError(error)
      if (httpStatus !== 401 && httpStatus !== 403) throw error
    }
  }
  return null
}

export async function leaveCommunity(communityId: number): Promise<void> {
  await httpClient.delete(`/communities/${communityId}/members/me`)
}
