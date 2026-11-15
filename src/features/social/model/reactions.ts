export type ReactionTargetType = 'article' | 'post' | 'comment'
export type ReactionType = 'LIKE' | 'LOVE' | 'INSIGHTFUL'

export interface ReactionSummary {
  total: number
  byType: Record<ReactionType, number>
  /** Mi reacción actual; null si no he reaccionado o no hay sesión. */
  mine: ReactionType | null
}

export interface ReactionOption {
  type: ReactionType
  /** Nombre de los archivos de `public/reactions`: `<icon>.png` (quieto) y `<icon>.gif` (animado). */
  icon: string
  label: string
  /** Lo que dura un ciclo del GIF: tras ese tiempo el ícono vuelve a quedarse quieto. */
  playMs: number
}

export const REACTIONS: ReactionOption[] = [
  { type: 'LIKE', icon: 'like', label: 'Me gusta', playMs: 2820 },
  { type: 'LOVE', icon: 'love', label: 'Me encanta', playMs: 2000 },
  { type: 'INSIGHTFUL', icon: 'insightful', label: 'Esclarecedor', playMs: 2000 },
]

export const EMPTY_SUMMARY: ReactionSummary = { total: 0, byType: { LIKE: 0, LOVE: 0, INSIGHTFUL: 0 }, mine: null }

/**
 * Resultado de pulsar una reacción: la misma la quita, otra reemplaza a la anterior.
 * Se usa para actualizar los conteos al instante, sin esperar al servidor.
 */
export function applyReaction(summary: ReactionSummary, type: ReactionType): ReactionSummary {
  const byType = { ...summary.byType }
  if (summary.mine) byType[summary.mine] = Math.max(0, byType[summary.mine] - 1)
  const mine = summary.mine === type ? null : type
  if (mine) byType[mine] += 1
  return { byType, mine, total: byType.LIKE + byType.LOVE + byType.INSIGHTFUL }
}
