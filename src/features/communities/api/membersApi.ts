import { httpClient } from '../../../shared/api';
import type { Membership } from '../model/community.types';

export async function joinCommunity(communityId: number) {
  const response = await httpClient.post<Membership>(
    `/communities/${communityId}/members`,
  );
  return response.data;
}

export async function leaveCommunity(communityId: number) {
  await httpClient.delete(`/communities/${communityId}/members/me`);
}
