import { useRef, useState } from 'react'
import { PostDeleteDialog } from '@/features/social/components/PostDeleteDialog'
import { PostList } from '@/features/social/components/PostList'
import { PostsTabs } from '@/features/social/components/PostsTabs'
import { useMyPosts } from '@/features/social/hooks/useMyPosts'
import type { Post } from '@/features/social/model/post.types'
import './PostsPage.css'

export function MyPostsPage() {
  const { list, isDeleting, notice, remove } = useMyPosts()
  const [selected, setSelected] = useState<Post | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)

  function closeDialog() {
    setSelected(null)
    // Si el post se eliminó su botón ya no existe: el foco pasa al título de la página.
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else heading.current?.focus()
    })
  }

  return (
    <main className="page-shell posts-page">
      <header className="page-header">
        <p className="eyebrow">Noema · Publicaciones</p>
        <h1 ref={heading} tabIndex={-1}>Mis posts</h1>
        <p>Todo lo que has publicado, respondido y compartido, en un solo lugar.</p>
      </header>
      <PostsTabs />
      <section className="posts-sheet" aria-labelledby="my-posts-heading" aria-busy={list.isLoading}>
        <header className="posts-sheet__heading">
          <h2 id="my-posts-heading">Tu actividad</h2>
          {!list.isLoading && !list.error && <span>{list.total} {list.total === 1 ? 'publicación' : 'publicaciones'}</span>}
        </header>
        <p className="posts-notice" role="status">{notice}</p>
        <PostList
          list={list}
          label="Mis publicaciones"
          loadingMessage="Cargando tus publicaciones…"
          empty={(
            <>
              <h3>Aún no has publicado nada.</h3>
              <p>Cuando publiques o respondas, tu actividad aparecerá aquí.</p>
            </>
          )}
          renderActions={(post) => (
            <button
              type="button"
              className="post-delete-link"
              disabled={isDeleting}
              onClick={(event) => {
                trigger.current = event.currentTarget
                setSelected(post)
              }}
            >
              Eliminar
            </button>
          )}
        />
      </section>
      {selected && (
        <PostDeleteDialog
          key={selected.id}
          post={selected}
          pending={isDeleting}
          onClose={closeDialog}
          onConfirm={() => remove(selected)}
        />
      )}
    </main>
  )
}
