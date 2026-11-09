import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/providers/AuthProvider'
import { NotificationsProvider } from './app/providers/NotificationsProvider'
import { ProfileProvider } from './app/providers/ProfileProvider'
import { router } from './app/router'

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}
