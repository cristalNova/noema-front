import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfileNewPage from './pages/ProfileNewPage'
import RegisterPage from './pages/RegisterPage'

// Esqueleto: los guards (rutas privadas) llegan con su HU.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/profile/new', element: <ProfileNewPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '*', element: <p>No encontrado</p> },
])
