import { NavLink } from 'react-router-dom'
import './PostsTabs.css'

/** Cada pestaña es una ruta: "Mis posts" es privada y sin sesión lleva al login. */
export function PostsTabs() {
  return (
    <nav className="posts-tabs" aria-label="Secciones de publicaciones">
      <NavLink to="/posts" end>Feed</NavLink>
      <NavLink to="/app/posts" end>Mis posts</NavLink>
    </nav>
  )
}
