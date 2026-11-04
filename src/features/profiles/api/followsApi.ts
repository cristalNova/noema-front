import { httpClient } from '@/shared/api'
import type { ProfileResponseDto } from '../model/profileDto'
import { toProfile } from '../model/profileMappers'

export async function listFollowing(profileId: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<ProfileResponseDto[]>(`/follows/following/${profileId}`, { signal })
  return data.map(toProfile)
}

export async function followProfile(profileId: number): Promise<void> {
  await httpClient.post(`/follows/${profileId}`)
}

export async function unfollowProfile(profileId: number): Promise<void> {
  await httpClient.delete(`/follows/${profileId}`)
}
