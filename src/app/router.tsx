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

// Esqueleto: rutas públicas y privadas. Los guards (feature auth) se agregan después.
export const router = createBrowserRouter([
  {
    // Privadas: envolver con RequireAuth cuando exista.
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireProfile />,
            children: [
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
    children: [
      {
        element: <RequireProfile />,
        children: [{ path: '/onboarding/interests', element: <InterestsPage /> }],
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
