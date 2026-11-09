// DTOs: forma exacta del backend (whitelist estricta: no enviar campos extra).

export interface CreateProfileRequestDto {
  username: string
  name: string
  profilePhoto?: string
  bio?: string
  website?: string
  socialLinks?: Record<string, string>
}

/** PATCH: parcial. Para vaciar un opcional hay que enviar null (un string vacío da 400). */
export interface UpdateProfileRequestDto {
  name?: string
  profilePhoto?: string | null
  bio?: string | null
  website?: string | null
  socialLinks?: Record<string, string> | null
}

export interface ProfileResponseDto {
  id: number
  userId: number
  username: string
  name: string
  profilePhoto?: string | null
  bio?: string | null
  website?: string | null
  socialLinks?: Record<string, string> | null
  isVerified: boolean
  followersCount: number
  createdAt: string
}
