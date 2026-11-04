import { httpClient } from '@/shared/api'

export async function getPreferences(signal?: AbortSignal): Promise<string[]> {
  const { data } = await httpClient.get<string[]>('/preferences', { signal })
  return data
}

export async function replacePreferences(tags: string[]): Promise<string[]> {
  const { data } = await httpClient.put<string[]>('/preferences', { tags })
  return data
}
