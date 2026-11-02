import type { NewAccount } from './Account'
import type { JwtPayloadDto, LoginResponseDto, RegisterRequestDto } from './authDto'
import type { Session } from './Session'

export function toRegisterDto(account: NewAccount, roleIds: number[]): RegisterRequestDto {
  const dto: RegisterRequestDto = {
    email: account.email,
    password: account.password,
    roleIds,
  }
  if (account.phoneNumber) dto.phoneNumber = account.phoneNumber
  return dto
}

function decodeJwt(token: string): JwtPayloadDto | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayloadDto
  } catch {
    return null
  }
}

/** Reconstruye la sesión desde el JWT (los permisos solo viajan ahí). */
export function sessionFromToken(token: string): Session | null {
  const payload = decodeJwt(token)
  if (!payload || typeof payload.exp !== 'number') return null
  return {
    token,
    expiresAt: payload.exp * 1000,
    user: {
      id: String(payload.sub),
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    },
  }
}

export function toSession(dto: LoginResponseDto): Session | null {
  return sessionFromToken(dto.access_token)
}

export function isExpired(session: Session, now = Date.now()): boolean {
  return session.expiresAt <= now
}
