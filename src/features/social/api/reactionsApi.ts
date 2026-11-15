// /reactions/:targetType/:targetId
import { httpClient } from '@/shared/api'
import type { ReactionSummary, ReactionTargetType, ReactionType } from '../model/reactions'

/** Conteo por tipo y mi reacción. Es público: sin sesión `mine` llega en null. */
export async function getReactionSummary(targetType: ReactionTargetType, targetId: number, signal?: AbortSignal): Promise<ReactionSummary> {
  const { data } = await httpClient.get<ReactionSummary>(`/reactions/${targetType}/${targetId}`, { signal })
  return data
}

/** Reacciona, o cambia el tipo si ya había reaccionado. */
export async function setReaction(targetType: ReactionTargetType, targetId: number, type: ReactionType): Promise<void> {
  await httpClient.put(`/reactions/${targetType}/${targetId}`, { type })
}

/** 204. Responde 404 si no había reaccionado. */
export async function removeReaction(targetType: ReactionTargetType, targetId: number): Promise<void> {
  await httpClient.delete(`/reactions/${targetType}/${targetId}`)
}
