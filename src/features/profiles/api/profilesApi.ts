import { ApiError, httpClient } from '@/shared/api'
import type { NewProfile, Profile } from '../model/Profile'
import type { ProfileResponseDto } from '../model/profileDto'
import { toCreateProfileDto, toProfile } from '../model/profileMappers'

// Pendiente (otras HU): GET /profiles, PATCH /me, DELETE /me, GET /:id

export const profilesApi = {
  /** POST /profiles (requiere JWT). 409 si el username está en uso o ya hay perfil. */
  async create(profile: NewProfile): Promise<Profile> {
    const { data } = await httpClient.post<ProfileResponseDto>(
      '/profiles',
      toCreateProfileDto(profile),
    )
    return toProfile(data)
  },

  /** GET /profiles/me. Devuelve null si el usuario aún no tiene perfil (404). */
  async getMine(): Promise<Profile | null> {
    try {
      const { data } = await httpClient.get<ProfileResponseDto>('/profiles/me')
      return toProfile(data)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
}
