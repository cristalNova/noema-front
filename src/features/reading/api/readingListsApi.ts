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
  // GET /mine devuelve el resumen; GET /:id incluye los ensayos.
  items?: ReadingListItem[]
}
export interface ReadingListItem {
  articleId: number
  orderIndex: number
  article?: { id: number; title: string; description?: string }
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

export async function getReadingList(id: number, signal?: AbortSignal): Promise<ReadingList> {
  const response = await httpClient.get<ReadingList>(`/reading-lists/${id}`, { signal })
  return response.data
}

export async function addReadingListItem(id: number, articleId: number): Promise<void> {
  await httpClient.post(`/reading-lists/${id}/items`, { articleId })
}

export async function removeReadingListItem(id: number, articleId: number): Promise<void> {
  await httpClient.delete(`/reading-lists/${id}/items/${articleId}`)
}

export async function reorderReadingListItems(id: number, articleIds: number[]): Promise<void> {
  await httpClient.put(`/reading-lists/${id}/items/order`, { articleIds })
}

/** El servidor solo devuelve listas públicas en esta ruta. */
export async function listPublicReadingLists(profileId: number, signal?: AbortSignal): Promise<PublicReadingList[]> {
  const response = await httpClient.get<PublicReadingList[]>(`/reading-lists/profile/${profileId}`, { signal })
  return response.data.filter((list) => list.visibility === 'PUBLIC')
}
