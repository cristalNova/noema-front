import { Link } from 'react-router-dom'
import type { Attribution } from '../hooks/useArticleAttribution'
import './ArticleByline.css'

/** Autor y, si el ensayo pertenece a una comunidad, cuál es. */
export function ArticleByline({ author, community }: { author: Attribution | null; community: Attribution | null }) {
  if (!author && !community) return null
  return (
    <div className="article-byline">
      {author && (
        <span className="article-byline__author">
          {author.name ? <>Por <Link to={`/profiles/${author.id}`}>{author.name}</Link></> : <Link to={`/profiles/${author.id}`}>Ver perfil del autor</Link>}
        </span>
      )}
      {community && (
        <span className="article-byline__community">
          <span className="article-byline__label">Comunidad</span>
          {/* Sin nombre resuelto no hay un destino claro, pero se indica que es de una comunidad. */}
          {community.name ? <Link to={`/communities/${community.id}`}>{community.name}</Link> : <span>Ensayo de comunidad</span>}
        </span>
      )}
    </div>
  )
}
