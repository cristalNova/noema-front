import { httpClient } from '@/shared/api'

export interface PublicReadingList {
  id: number
  profileId: number
  name: string
  visibility: 'PUBLIC' | 'PRIVATE'
  createdAt: string
}

/** El servidor solo devuelve listas públicas en esta ruta. */
export async function listPublicReadingLists(profileId: number, signal?: AbortSignal): Promise<PublicReadingList[]> {
  const response = await httpClient.get<PublicReadingList[]>(`/reading-lists/profile/${profileId}`, { signal })
  return response.data.filter((list) => list.visibility === 'PUBLIC')
}
