import { Outlet } from 'react-router-dom'
import { useRestoreScroll } from '@/shared/utils/useRestoreScroll'
import { AuthPromptProvider } from '../providers/AuthPromptProvider'
import { BookBackdrop } from './BookBackdrop'
import { NavBar } from './NavBar'

export function AppLayout() {
  useRestoreScroll()

  return (
    <AuthPromptProvider>
      <div className="app-layout">
        <BookBackdrop />
        <NavBar />
        <Outlet />
      </div>
    </AuthPromptProvider>
  )
}
