import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useRelatedPost } from '../hooks/useRelatedPost'
import type { Post, PostAuthor } from '../model/post.types'
import { POST_TYPE_LABELS, VISIBILITY_LABELS } from '../model/posts'
import { EmbeddedPost } from './EmbeddedPost'
import { PostActions, type PostCountChange } from './PostActions'
import { ReactionBar } from './ReactionBar'
import { ReplyThread } from './ReplyThread'
import './PostCard.css'

interface PostCardProps {
  post: Post
  /** En el detalle el post ya está abierto: no se enlaza a sí mismo. */
  linkToDetail?: boolean
  /** Dentro de una comunidad, enlazar a ella sería redundante. */
  showCommunity?: boolean
  actions?: ReactNode
  /** Se llama al responder, repostear o citar desde la tarjeta, con el post nuevo, para que la página lo muestre. */
  onCreated?: (created: Post) => void
  /** Muestra las primeras respuestas bajo el post, con sangría, como un hilo. */
  showThread?: boolean
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

export function PostCard({ post, linkToDetail = true, showCommunity = true, actions, onCreated, showThread = false }: PostCardProps) {
  const { owner, postType, visibility, article } = post
  // Respuestas, reposts y citas apuntan a otro post: se pide una vez (se comparte entre tarjetas) para enlazarlo o incrustarlo.
  const related = useRelatedPost(post.parentPostId)
  const [added, setAdded] = useState({ replies: 0, reposts: 0 })
  const [newReplies, setNewReplies] = useState<Post[]>([])
  const isReply = postType === 'REPLY' && post.parentPostId != null
  const embedsOriginal = (postType === 'REPOST' || postType === 'QUOTE') && post.parentPostId != null
  // No se puede republicar ni citar un repost: esas acciones van al post original que muestra la tarjeta.
  const original = postType === 'REPOST' ? related.post : post

  function countChange(change: PostCountChange) {
    setAdded((previous) => ({ replies: previous.replies + (change.replies ?? 0), reposts: previous.reposts + (change.reposts ?? 0) }))
  }

  function created(newPost: Post) {
    // Una respuesta a este mismo post entra de inmediato al hilo; el resto lo decide la página.
    if (newPost.postType === 'REPLY' && newPost.parentPostId === post.id) setNewReplies((previous) => [...previous, newPost])
    onCreated?.(newPost)
  }

  const replyTotal = post.commentCount + added.replies

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

      {isReply && (
        <p className="post-card__replying">
          <span aria-hidden="true">↩</span> En respuesta a{' '}
          <Link to={`/posts/${post.parentPostId}`}>{related.post ? related.post.owner.name : 'una publicación'}</Link>
        </p>
      )}

      <p className="post-card__content">{post.content || fallbackContent(post)}</p>

      {embedsOriginal && <EmbeddedPost parentPostId={post.parentPostId!} related={related} />}

      {article && <p className="post-card__article">Sobre <Link to={`/articles/${article.id}`}>{article.title}</Link></p>}

      <footer className="post-card__footer">
        <div className="post-card__reactions"><ReactionBar target="post" targetId={post.id} subject="Reacciones a esta publicación" /></div>
        <div className="post-card__actions"><PostActions post={post} original={original} onCreated={created} onCountChange={countChange} /></div>
        <p className="post-card__stats">
          <span>{count(replyTotal, 'respuesta', 'respuestas')}</span>
          <span>{count(post.repostCount + added.reposts, 'republicación', 'republicaciones')}</span>
        </p>
        <div className="post-card__links">
          {showCommunity && post.communityId !== null && <Link to={`/communities/${post.communityId}`}>Ver comunidad</Link>}
          {linkToDetail && <Link to={`/posts/${post.id}`} aria-label={`Abrir la publicación de ${owner.name}`}>Abrir <span aria-hidden="true">↗</span></Link>}
          {actions}
        </div>
      </footer>

      {showThread && postType !== 'REPOST' && replyTotal > 0 && <ReplyThread postId={post.id} added={newReplies} total={replyTotal} />}
    </article>
  )
}
