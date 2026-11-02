import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/features/auth'
import { AppLayout } from './layout/AppLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfileNewPage from './pages/ProfileNewPage'
import RegisterPage from './pages/RegisterPage'

// Rutas privadas: colgar de <RequireAuth /> (redirige al login si no hay sesión).
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [{ path: '/profile/new', element: <ProfileNewPage /> }],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '*', element: <p>No encontrado</p> },
])
