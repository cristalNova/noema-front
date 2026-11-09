import { httpClient } from '../../../shared/api'
import type { Profile } from '../model/Profile'
import type { ProfileResponseDto } from '../model/profileDto'
import { toCreateProfileDto, toProfile, toUpdateProfileDto } from '../model/profileMappers'
import type { NewProfile, ProfileChanges } from '../model/Profile'

async function getMine(): Promise<Profile> {
  const response = await httpClient.get<ProfileResponseDto>('/profiles/me')
  return toProfile(response.data)
}

async function create(profile: NewProfile): Promise<Profile> {
  const response = await httpClient.post<ProfileResponseDto>('/profiles', toCreateProfileDto(profile))
  return toProfile(response.data)
}

async function getById(id: number, signal?: AbortSignal): Promise<Profile> {
  const response = await httpClient.get<ProfileResponseDto>(`/profiles/${id}`, { signal })
  return toProfile(response.data)
}

/** PATCH /profiles/me: solo se envían los campos editables. */
async function update(changes: ProfileChanges): Promise<Profile> {
  const response = await httpClient.patch<ProfileResponseDto>('/profiles/me', toUpdateProfileDto(changes))
  return toProfile(response.data)
}

/**
 * DELETE /profiles/me (204). Borra el perfil y, en cascada, todo lo que cuelga de él
 * (ensayos, posts, comentarios, comunidades, seguidores…). La cuenta de acceso permanece.
 */
async function remove(): Promise<void> {
  await httpClient.delete('/profiles/me')
}

export const profilesApi = { getMine, create, getById, update, remove }
export const getMyProfile = getMine

export interface AuthorOption {
  id: number
  name: string
  username: string
}

// GET /profiles: público y sin paginar. Sirve como lista de autores para el filtro.
export async function listAuthors(signal?: AbortSignal): Promise<AuthorOption[]> {
  const response = await httpClient.get<AuthorOption[]>('/profiles', { signal })
  return response.data
}
