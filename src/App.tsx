import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/providers/AuthProvider'
import { ProfileProvider } from './app/providers/ProfileProvider'
import { router } from './app/router'

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <RouterProvider router={router} />
      </ProfileProvider>
    </AuthProvider>
  )
}
