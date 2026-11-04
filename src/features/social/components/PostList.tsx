import type { ReactNode } from 'react'
import { Pagination } from '@/shared/components/Pagination'
import type { PagedPosts } from '../hooks/usePagedPosts'
import type { Post } from '../model/post.types'
import { PostCard } from './PostCard'
import './PostList.css'

interface PostListProps {
  list: PagedPosts
  /** Nombre accesible de la lista y de su paginación. */
  label: string
  loadingMessage: string
  empty: ReactNode
  renderActions?: (post: Post) => ReactNode
}

export function PostList({ list, label, loadingMessage, empty, renderActions }: PostListProps) {
  if (list.isLoading) return <p className="status-message" role="status">{loadingMessage}</p>
  if (list.error) {
    return (
      <div className="status-message status-message--error" role="alert">
        <p>{list.error}</p>
        <button type="button" className="button button--secondary" onClick={list.reload}>Reintentar</button>
      </div>
    )
  }
  if (list.posts.length === 0) return <div className="post-list__empty">{empty}</div>

  return (
    <>
      <ul className="post-list" aria-label={label}>
        {list.posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} actions={renderActions?.(post)} />
          </li>
        ))}
      </ul>
      {list.total > list.limit && (
        <Pagination page={list.page} total={list.total} limit={list.limit} label={`Paginación: ${label}`} onPageChange={list.setPage} />
      )}
    </>
  )
}
