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

/** Lo que se puede cambiar de un perfil existente (el username no se edita aquí). */
export interface ProfileChanges {
  name: string
  photoUrl: string | null
  bio: string | null
  website: string | null
  /** Reemplaza el conjunto completo: lo que falte aquí se elimina del perfil. */
  socialLinks: Record<string, string>
}

export interface NewProfile {
  username: string
  name: string
  photoUrl?: string
  bio?: string
  website?: string
  socialLinks?: Record<string, string>
}
