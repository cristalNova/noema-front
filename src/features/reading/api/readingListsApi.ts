import { httpClient } from '@/shared/api'

export interface PublicReadingList {
  id: number
  profileId: number
  name: string
  status: ReadingListStatus
  visibility: 'PUBLIC' | 'PRIVATE'
  createdAt: string
}

export type ReadingListStatus = 'WANT_TO_READ' | 'READING' | 'READ' | 'CUSTOM'
export type ReadingListVisibility = 'PUBLIC' | 'PRIVATE'
export interface ReadingList extends PublicReadingList {
  items: { articleId: number; orderIndex: number }[]
}
export interface ReadingListInput {
  name: string
  status: ReadingListStatus
  visibility: ReadingListVisibility
}

export async function listMyReadingLists(signal?: AbortSignal): Promise<ReadingList[]> {
  const response = await httpClient.get<ReadingList[]>('/reading-lists/mine', { signal })
  return response.data
}

export async function createReadingList(input: ReadingListInput): Promise<ReadingList> {
  const response = await httpClient.post<ReadingList>('/reading-lists', input)
  return response.data
}

export async function updateReadingList(id: number, input: ReadingListInput): Promise<ReadingList> {
  const response = await httpClient.patch<ReadingList>(`/reading-lists/${id}`, input)
  return response.data
}

export async function deleteReadingList(id: number): Promise<void> {
  await httpClient.delete(`/reading-lists/${id}`)
}

/** El servidor solo devuelve listas públicas en esta ruta. */
export async function listPublicReadingLists(profileId: number, signal?: AbortSignal): Promise<PublicReadingList[]> {
  const response = await httpClient.get<PublicReadingList[]>(`/reading-lists/profile/${profileId}`, { signal })
  return response.data.filter((list) => list.visibility === 'PUBLIC')
}
