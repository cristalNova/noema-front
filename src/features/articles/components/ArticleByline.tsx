import { Link } from 'react-router-dom'
import type { Attribution } from '../hooks/useArticleAttribution'
import './ArticleByline.css'

/** Autor y, si el ensayo pertenece a una comunidad, cuál es. */
export function ArticleByline({ author, community }: { author: Attribution | null; community: Attribution | null }) {
  if (!author?.name && !community) return null
  return (
    <div className="article-byline">
      {author?.name && <span className="article-byline__author">Por <Link to={`/profiles/${author.id}`}>{author.name}</Link></span>}
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
