import { useContext } from 'react'
import { ProfileContext, type ProfileContextValue } from './ProfileContext'

export function useMyProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useMyProfile debe usarse dentro de <ProfileProvider>')
  return ctx
}
