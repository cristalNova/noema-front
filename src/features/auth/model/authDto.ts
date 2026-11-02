// DTOs: forma exacta del backend (whitelist estricta: no enviar campos extra).

export interface RegisterRequestDto {
  email: string
  password: string
  phoneNumber?: string
  roleIds: number[]
}

export interface LoginResponseDto {
  access_token: string
  token_type: 'Bearer'
  user: { id: number; email: string; roles: string[] }
}

export interface JwtPayloadDto {
  sub: number
  email: string
  roles: string[]
  permissions: string[]
  jti: string
  exp: number
}
