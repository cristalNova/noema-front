import { useContext } from 'react'
import { UnreadContext, type UnreadContextValue } from './UnreadContext'

export function useUnreadCount(): UnreadContextValue {
  const ctx = useContext(UnreadContext)
  if (!ctx) throw new Error('useUnreadCount debe usarse dentro de <NotificationsProvider>')
  return ctx
}
