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

// Esqueleto: rutas públicas y privadas. Los guards (feature auth) se agregan después.
export const router = createBrowserRouter([
  { path: '/', element: <p>Noema</p> },
  { path: '/login', element: <p>Login (pendiente)</p> },
  { path: '/communities', element: <CommunitiesPage /> },
  { path: '/communities/:id', element: <CommunityDetailPage /> },
  {
    // Privadas: envolver con RequireAuth cuando exista.
    path: '/app',
    element: <p>Área privada (pendiente)</p>,
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
  { path: '*', element: <p>No encontrado</p> },
])
