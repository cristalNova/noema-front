// /collections
import { httpClient } from '../../../shared/api'

export interface CollectionOption {
  id: number
  authorId: number
  title: string
}

// GET /collections: público y sin paginar. Se pide completo una vez y se filtra por autor en el cliente.
export async function listCollections(signal?: AbortSignal): Promise<CollectionOption[]> {
  const response = await httpClient.get<CollectionOption[]>('/collections', { signal })
  return response.data
}
