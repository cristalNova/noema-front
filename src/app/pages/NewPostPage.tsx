import { Link, useNavigate } from 'react-router-dom'
import { PostComposer } from '@/features/social/components/PostComposer'
import './PostsPage.css'

/** Formulario para publicar un post. Al publicar se vuelve al feed, donde el post nuevo aparece primero. */
export function NewPostPage() {
  const navigate = useNavigate()

  return (
    <main className="page-shell posts-page new-post-page">
      <Link className="back-link" to="/posts">← Volver al feed</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Publicaciones</p>
        <h1>Nueva publicación</h1>
        <p>Comparte una idea con quienes leen y escriben en Noema.</p>
      </header>
      <section className="posts-sheet" aria-label="Formulario para publicar">
        <PostComposer onCreated={() => navigate('/posts')} />
      </section>
    </main>
  )
}
