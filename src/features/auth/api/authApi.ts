import { httpClient } from '@/shared/api'
import type { Credentials, NewAccount } from '../model/Account'
import type { LoginResponseDto } from '../model/authDto'
import { toRegisterDto, toSession } from '../model/authMappers'
import type { Session } from '../model/Session'

// Pendiente (otras HU): POST /auth/logout

export const authApi = {
  /** Registro público: POST /users (201, sin token). */
  async register(account: NewAccount, roleIds: number[]): Promise<void> {
    await httpClient.post('/users', toRegisterDto(account, roleIds))
  },

  /** POST /auth/login. */
  async login(credentials: Credentials): Promise<Session> {
    const { data } = await httpClient.post<LoginResponseDto>('/auth/login', credentials)
    const session = toSession(data)
    if (!session) throw new Error('El servidor devolvió un token inválido.')
    return session
  },
}
