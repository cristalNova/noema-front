import { httpClient } from '@/shared/api'
import type { ProfileResponseDto } from '../model/profileDto'
import { toProfile } from '../model/profileMappers'

// GET /follows/followers/:id y /following/:id son públicos y NO paginan: devuelven todos los perfiles.

export async function listFollowers(profileId: number, signal?: AbortSignal) {
  const { data } = await httpClient.get<ProfileResponseDto[]>(`/follows/followers/${profileId}`, { signal })
  return data.map(toProfile)
}

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
