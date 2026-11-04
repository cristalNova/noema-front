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
import { CreateCommunityPage } from './pages/CreateCommunityPage'
import { PublishedArticlesPage } from './pages/PublishedArticlesPage'
import { ArticleDetailPage } from './pages/ArticleDetailPage'
import { MyPostsPage } from './pages/MyPostsPage'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostsFeedPage } from './pages/PostsFeedPage'
import { AuthorPlansPage } from './pages/AuthorPlansPage'

export const router = createBrowserRouter([
  {
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
              { path: '/app/articles/:id', element: <ArticleDetailPage owned /> },
              { path: '/app/posts', element: <MyPostsPage /> },
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
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/articles', element: <PublishedArticlesPage /> },
      { path: '/articles/:id', element: <ArticleDetailPage /> },
      { path: '/posts', element: <PostsFeedPage /> },
      { path: '/posts/:id', element: <PostDetailPage /> },
      { path: '/communities', element: <CommunitiesPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireProfile />,
            children: [
              { path: '/communities/new', element: <CreateCommunityPage /> },
              { path: '/authors/:authorId/plans', element: <AuthorPlansPage /> },
            ],
          },
        ],
      },
      { path: '/communities/:id', element: <CommunityDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
