import { httpClient } from '../../../shared/api'
import type { Profile } from '../model/Profile'
import type { ProfileResponseDto } from '../model/profileDto'
import { toCreateProfileDto, toProfile } from '../model/profileMappers'
import type { NewProfile } from '../model/Profile'

async function getMine(): Promise<Profile> {
  const response = await httpClient.get<ProfileResponseDto>('/profiles/me')
  return toProfile(response.data)
}

async function create(profile: NewProfile): Promise<Profile> {
  const response = await httpClient.post<ProfileResponseDto>('/profiles', toCreateProfileDto(profile))
  return toProfile(response.data)
}

export const profilesApi = { getMine, create }
export const getMyProfile = getMine
