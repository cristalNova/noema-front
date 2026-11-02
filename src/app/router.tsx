import { createBrowserRouter } from 'react-router-dom'
import { CommunitiesPage } from './pages/CommunitiesPage'
import { CommunityDetailPage } from './pages/CommunityDetailPage'
import { CreateDraftPage } from './pages/CreateDraftPage'
import { MyArticlesPage } from './pages/MyArticlesPage'
import { RequireAuth } from '@/features/auth'
import { RequireProfile } from '@/features/profiles'
import { AppLayout } from './layout/AppLayout'
import HomePage from './pages/HomePage'
import InterestsPage from './pages/InterestsPage'
import LoginPage from './pages/LoginPage'
import ProfileNewPage from './pages/ProfileNewPage'
import RegisterPage from './pages/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublishedArticlesPage } from './pages/PublishedArticlesPage'

// Rutas privadas: colgar de <RequireAuth /> (redirige al login si no hay sesión).
// Las que además necesitan perfil van dentro de <RequireProfile /> (redirige a /profile/new).
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/articles', element: <PublishedArticlesPage /> },
      { path: '/communities', element: <CommunitiesPage /> },
      { path: '/communities/:id', element: <CommunityDetailPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireProfile />,
            children: [
              { path: '/onboarding/interests', element: <InterestsPage /> },
              { path: '/app/articles/new', element: <CreateDraftPage /> },
              { path: '/app/articles', element: <MyArticlesPage /> },
              { path: '/app/articles/:id/edit', element: <CreateDraftPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/profile/new', element: <ProfileNewPage /> }],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
])
