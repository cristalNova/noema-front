export interface DraftInput {
  title: string
  description: string
  content: string
  isPremium: boolean
  communityId: number | null
}

export interface Article extends DraftInput {
  id: number
  authorId: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  updatedAt: string
}

export type DraftField = keyof DraftInput
export type DraftErrors = Partial<Record<DraftField, string[]>>
