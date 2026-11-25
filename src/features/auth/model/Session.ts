export interface AuthUser {
  id: string
  email: string
  roles: string[]
  permissions: string[]
}

export interface Session {
  token: string
  user: AuthUser
  /** Expiración en ms desde epoch. */
  expiresAt: number
}
