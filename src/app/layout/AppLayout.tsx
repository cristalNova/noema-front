import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'

export function AppLayout() {
  return (
    <div className="app-layout">
      <NavBar />
      <Outlet />
    </div>
  )
}
