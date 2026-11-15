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

// PATCH /collections/:id: solo su autor. 403 si es de otro, 404 si no existe.
export async function updateCollection(id: number, input: { title: string; description: string }): Promise<CollectionOption> {
  const response = await httpClient.patch<CollectionOption>(`/collections/${id}`, input)
  return response.data
}

// PUT /collections/:id/order: 204. Recibe los ids de los ensayos en el orden deseado (posiciones 1..n).
// 400 si alguno no pertenece a la colección o se repite; 403 si es de otro autor.
export async function reorderCollectionEssays(id: number, articleIds: number[]): Promise<void> {
  await httpClient.put(`/collections/${id}/order`, { articleIds })
}

// DELETE /collections/:id: 204. Los ensayos que contenía no se borran: quedan sin colección.
export async function deleteCollection(id: number): Promise<void> {
  await httpClient.delete(`/collections/${id}`)
}

