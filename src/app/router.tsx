import { createBrowserRouter } from 'react-router-dom'
import { CommunitiesPage } from './pages/CommunitiesPage'
import { MyCommunitiesPage } from './pages/MyCommunitiesPage'
import { CommunityDetailPage } from './pages/CommunityDetailPage'
import { CreateDraftPage } from './pages/CreateDraftPage'
import { EditCommunityPage } from './pages/EditCommunityPage'
import { MyArticlesPage } from './pages/MyArticlesPage'
import { CollectionsPage } from './pages/CollectionsPage'
import { NewCollectionPage } from './pages/NewCollectionPage'
import { CollectionDetailPage } from './pages/CollectionDetailPage'
import { EditCollectionPage } from './pages/EditCollectionPage'
import { RequireAuth } from '@/features/auth'
import { RequireProfile } from '@/features/profiles'
import { AppLayout } from './layout/AppLayout'
import HomePage from './pages/HomePage'
import InterestsPage from './pages/InterestsPage'
import LoginPage from './pages/LoginPage'
import ProfileNewPage from './pages/ProfileNewPage'
import RegisterPage from './pages/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CreateCommunityPage } from './pages/CreateCommunityPage'
import { PublishedArticlesPage } from './pages/PublishedArticlesPage'
import { ArticleDetailPage } from './pages/ArticleDetailPage'
import { TagsPage } from './pages/TagsPage'
import { AuthorProfilePage } from './pages/AuthorProfilePage'
import { MyPlansPage } from './pages/MyPlansPage'
import { MyPostsPage } from './pages/MyPostsPage'
import { EditPlanPage, NewPlanPage } from './pages/PlanFormPage'
import { PlansPage } from './pages/PlansPage'
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
              { path: '/app/collections', element: <CollectionsPage /> },
              { path: '/app/collections/new', element: <NewCollectionPage /> },
              { path: '/app/collections/:id', element: <CollectionDetailPage /> },
              { path: '/app/collections/:id/edit', element: <EditCollectionPage /> },
              { path: '/app/articles/:id/edit', element: <CreateDraftPage /> },
              { path: '/app/articles/:id', element: <ArticleDetailPage owned /> },
              { path: '/app/posts', element: <MyPostsPage /> },
              { path: '/app/notifications', element: <NotificationsPage /> },
              { path: '/app/communities', element: <MyCommunitiesPage /> },
              { path: '/app/profile/edit', element: <EditProfilePage /> },
              { path: '/app/plans', element: <MyPlansPage /> },
              { path: '/app/plans/new', element: <NewPlanPage /> },
              { path: '/app/plans/:id/edit', element: <EditPlanPage /> },
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
      { path: '/tags', element: <TagsPage /> },
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
              { path: '/communities/mine', element: <MyCommunitiesPage /> },
              { path: '/communities/:id/edit', element: <EditCommunityPage /> },
              { path: '/authors/:authorId/plans', element: <AuthorPlansPage /> },
            ],
          },
        ],
      },
      { path: '/communities/:id', element: <CommunityDetailPage /> },
      { path: '/communities/:id/plans', element: <PlansPage kind="community" /> },
      { path: '/profiles/:id', element: <AuthorProfilePage /> },
      { path: '/profiles/:id/plans', element: <PlansPage kind="author" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
