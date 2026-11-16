import { Link } from 'react-router-dom'
import './NewPostLink.css'

/** Icono de lápiz que lleva al formulario para publicar. Sin sesión, la ruta privada lleva a iniciar sesión. */
export function NewPostLink() {
  return (
    <Link className="new-post-link" to="/app/posts/new" aria-label="Publicar un post" title="Publicar un post">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </Link>
  )
}
