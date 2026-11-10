// "Mis comunidades": GET /communities/mine devuelve membresías ACTIVAS con la comunidad anidada.

export type MyCommunityRole = 'OWNER' | 'MODERATOR' | 'MEMBER'

export interface MyCommunityDto {
  profileId: number
  communityId: number
  role: string
  status: string
  joinedAt: string
  community?: {
    id: number
    name: string
    topic: string
    description?: string | null
    isPremium: boolean
  }
}

export interface MyCommunity {
  id: number
  name: string
  topic: string
  description: string | null
  isPremium: boolean
  role: MyCommunityRole
  joinedAt: string
}

const ROLES: readonly MyCommunityRole[] = ['OWNER', 'MODERATOR', 'MEMBER']

/** Devuelve null si la membresía no trae su comunidad (no hay nada que mostrar). */
export function toMyCommunity(dto: MyCommunityDto): MyCommunity | null {
  const { community } = dto
  if (!community) return null
  return {
    id: community.id,
    name: community.name,
    topic: community.topic,
    description: community.description ?? null,
    isPremium: community.isPremium,
    role: ROLES.find((role) => role === dto.role) ?? 'MEMBER',
    joinedAt: dto.joinedAt,
  }
}

export const ROLE_LABELS: Record<MyCommunityRole, string> = {
  OWNER: 'Propietario',
  MODERATOR: 'Moderador',
  MEMBER: 'Miembro',
}

/** El propietario no puede salir (el backend lo rechaza con 400); cualquier otro miembro sí. */
export function canLeave(community: Pick<MyCommunity, 'role'>): boolean {
  return community.role !== 'OWNER'
}
