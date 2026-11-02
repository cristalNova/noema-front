import { httpClient } from '../../../shared/api'

export async function joinCommunity(communityId: number) {
  await httpClient.post(`/communities/${communityId}/members`)
}
