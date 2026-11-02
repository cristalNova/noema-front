import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/features/auth'
import { RequireProfile } from '@/features/profiles'
import { AppLayout } from './layout/AppLayout'
import HomePage from './pages/HomePage'
import InterestsPage from './pages/InterestsPage'
import LoginPage from './pages/LoginPage'
import ProfileNewPage from './pages/ProfileNewPage'
import RegisterPage from './pages/RegisterPage'
import { CommunitiesPage } from './pages/CommunitiesPage';
import { CommunityDetailPage } from './pages/CommunityDetailPage';

// Rutas privadas: colgar de <RequireAuth /> (redirige al login si no hay sesión).
// Las que además necesitan perfil van dentro de <RequireProfile /> (redirige a /profile/new).
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireProfile />,
            children: [
              { path: '/onboarding/interests', element: <InterestsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/profile/new', element: <ProfileNewPage /> }],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/communities', element: <CommunitiesPage /> },
  { path: '/communities/:id', element: <CommunityDetailPage /> },
  { path: '*', element: <p>No encontrado</p> },
]);
