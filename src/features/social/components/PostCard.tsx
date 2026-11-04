import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Post, PostAuthor } from '../model/post.types'
import { POST_TYPE_LABELS, VISIBILITY_LABELS } from '../model/posts'
import './PostCard.css'

interface PostCardProps {
  post: Post
  /** En el detalle el post ya está abierto: no se enlaza a sí mismo. */
  linkToDetail?: boolean
  /** Dentro de una comunidad, enlazar a ella sería redundante. */
  showCommunity?: boolean
  actions?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const numberFormatter = new Intl.NumberFormat('es-CO')

function count(value: number, singular: string, plural: string) {
  return `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function Avatar({ author }: { author: PostAuthor }) {
  if (author.profilePhoto) return <img className="post-card__avatar" src={author.profilePhoto} alt="" />
  return <span className="post-card__avatar" aria-hidden="true">{initials(author.name)}</span>
}

function fallbackContent(post: Post) {
  return post.postType === 'REPOST' ? 'Republicó una publicación.' : 'Publicación sin contenido.'
}

export function PostCard({ post, linkToDetail = true, showCommunity = true, actions }: PostCardProps) {
  const { owner, postType, visibility, article } = post

  return (
    <article className="post-card">
      <header className="post-card__header">
        <Link className="post-card__author" to={`/posts?authorId=${post.ownerId}`} aria-label={`Ver publicaciones de ${owner.name}`}>
          <Avatar author={owner} />
          <span className="post-card__identity">
            <strong>{owner.name}</strong>
            {owner.username && <small>@{owner.username}</small>}
          </span>
        </Link>
        <time className="post-card__date" dateTime={post.createdAt}>{dateFormatter.format(new Date(post.createdAt))}</time>
      </header>

      {((postType && postType !== 'ORIGINAL') || (visibility && visibility !== 'PUBLIC')) && (
        <ul className="post-card__badges">
          {postType && postType !== 'ORIGINAL' && <li>{POST_TYPE_LABELS[postType]}</li>}
          {visibility && visibility !== 'PUBLIC' && <li className="post-card__badge--restricted">{VISIBILITY_LABELS[visibility]}</li>}
        </ul>
      )}

      <p className="post-card__content">{post.content || fallbackContent(post)}</p>

      {article && <p className="post-card__article">Sobre <Link to={`/articles/${article.id}`}>{article.title}</Link></p>}

      <footer className="post-card__footer">
        <p className="post-card__stats">
          <span>{count(post.likes, 'me gusta', 'me gusta')}</span>
          <span>{count(post.commentCount, 'respuesta', 'respuestas')}</span>
          <span>{count(post.repostCount, 'republicación', 'republicaciones')}</span>
        </p>
        <div className="post-card__links">
          {post.parentPostId != null && <Link to={`/posts/${post.parentPostId}`}>Ver original</Link>}
          {showCommunity && post.communityId !== null && <Link to={`/communities/${post.communityId}`}>Ver comunidad</Link>}
          {linkToDetail && <Link to={`/posts/${post.id}`} aria-label={`Abrir la publicación de ${owner.name}`}>Abrir <span aria-hidden="true">↗</span></Link>}
          {actions}
        </div>
      </footer>
    </article>
  )
}
