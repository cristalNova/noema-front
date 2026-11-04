// /collections
import { httpClient } from '../../../shared/api'

export interface CollectionOption {
  id: number
  authorId: number
  title: string
  description?: string | null
  createdAt?: string
}

// GET /collections: público y sin paginar. Se pide completo una vez y se filtra por autor en el cliente.
export async function listCollections(signal?: AbortSignal): Promise<CollectionOption[]> {
  const response = await httpClient.get<CollectionOption[]>('/collections', { signal })
  return response.data
}

export async function listAuthorCollections(authorId: number, signal?: AbortSignal): Promise<CollectionOption[]> {
  const response = await httpClient.get<CollectionOption[]>('/collections', { params: { authorId }, signal })
  return response.data
}

// GET /collections/:id: público. 404 si no existe.
export async function getCollection(id: number, signal?: AbortSignal): Promise<CollectionOption> {
  const response = await httpClient.get<CollectionOption>(`/collections/${id}`, { signal })
  return response.data
}

export async function createCollection(input: { title: string; description: string }): Promise<CollectionOption> {
  const response = await httpClient.post<CollectionOption>('/collections', input)
  return response.data
}

