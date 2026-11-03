import { Outlet } from 'react-router-dom'
import { BookBackdrop } from './BookBackdrop'
import { NavBar } from './NavBar'

export function AppLayout() {
  return (
    <div className="app-layout">
      <BookBackdrop />
      <NavBar />
      <Outlet />
    </div>
  )
}
