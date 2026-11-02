export interface Profile {
  id: number
  username: string
  name: string
  photoUrl: string | null
  bio: string | null
  website: string | null
  socialLinks: Record<string, string>
  isVerified: boolean
  followersCount: number
}

export interface NewProfile {
  username: string
  name: string
  photoUrl?: string
  bio?: string
  website?: string
  socialLinks?: Record<string, string>
}
