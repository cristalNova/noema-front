import { createContext } from 'react'
import type { Profile } from '../model/Profile'
import type { ProfileStatus } from './profileState'

export interface ProfileContextValue {
  status: ProfileStatus
  profile: Profile | null
  /** Vuelve a consultar GET /profiles/me (por ejemplo tras un error de red). */
  reload: () => void
  /** Guarda el perfil recién creado sin volver a consultar. */
  setProfile: (profile: Profile) => void
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
