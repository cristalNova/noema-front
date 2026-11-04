import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { profilesApi, type Profile } from '@/features/profiles'
import { exploreArticles } from '@/features/articles/api/articlesApi'
import { EMPTY_FILTERS, EXPLORE_PAGE_SIZE } from '@/features/articles/model/exploreFilters'
import { EssayCover } from '@/features/articles/components/EssayCover'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import { listPublicReadingLists, type PublicReadingList } from '@/features/reading/api/readingListsApi'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import { FollowControl } from '@/features/profiles/components/FollowControl'
import './AuthorProfilePage.css'

interface Settled {
  page: number
  attempt: number
  profile: Profile | null
  articles: ArticleSummary[]
  lists: PublicReadingList[]
  total: number
  error: string
  isUnavailable: boolean
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function externalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch { return null }
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <span className="author-profile__avatar" role="img" aria-label={`Foto de ${profile.name}`}>
      {initials(profile.name)}
      {profile.photoUrl && !imageFailed &&
        <img src={profile.photoUrl} alt="" onError={() => setImageFailed(true)} />}
    </span>
  )
}

function AuthorProfile({ id }: { id: number }) {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      let profile: Profile
      try {
        profile = await profilesApi.getById(id, controller.signal)
      } catch (reason) {
        if (!controller.signal.aborted) setSettled({ page, attempt, profile: null, articles: [], lists: [], total: 0, error: getErrorMessage(reason), isUnavailable: toApiError(reason).status === 404 })
        return
      }
      try {
        const [result, lists] = await Promise.all([
          exploreArticles({ ...EMPTY_FILTERS, authorId: id }, page, controller.signal),
          listPublicReadingLists(id, controller.signal),
        ])
        if (!controller.signal.aborted) setSettled({ page, attempt, profile, articles: result.data, lists, total: result.total, error: '', isUnavailable: false })
      } catch (reason) {
        if (!controller.signal.aborted) setSettled({ page, attempt, profile, articles: [], lists: [], total: 0, error: getErrorMessage(reason), isUnavailable: false })
      }
    }
    void load()
    return () => controller.abort()
  }, [id, page, attempt])

  const current = settled?.page === page && settled.attempt === attempt ? settled : null
  if (current?.isUnavailable) return <ProfileUnavailable />
  const profile = current?.profile ?? settled?.profile
  const website = profile?.website ? externalUrl(profile.website) : null
  const socialLinks = Object.entries(profile?.socialLinks ?? {}).map(([name, value]) => ({ name, url: externalUrl(value) })).filter((link) => link.url !== null)
  const pages = current ? Math.max(1, Math.ceil(current.total / EXPLORE_PAGE_SIZE)) : 1

  return (
    <main className="page-shell author-profile">
      {profile && <header className="author-profile__card">
        <div className="author-profile__identity">
          <ProfileAvatar profile={profile} />
          <div><p className="eyebrow">Noema · Perfil público</p><h1>{profile.name}</h1><p className="author-profile__username">@{profile.username}</p></div>
        </div>
        {profile.bio && <p className="author-profile__bio">{profile.bio}</p>}
        <FollowControl key={profile.id} profileId={profile.id} followersCount={profile.followersCount} />
        {(website || socialLinks.length > 0) && <ul className="author-profile__links" aria-label="Enlaces del perfil">
          {website && <li><a href={website} target="_blank" rel="noopener noreferrer">Sitio web ↗</a></li>}
          {socialLinks.map(({ name, url }) => <li key={name}><a href={url ?? undefined} target="_blank" rel="noopener noreferrer">{name} ↗</a></li>)}
        </ul>}
        <Link className="button button--primary author-profile__plans" to={`/profiles/${profile.id}/plans`}>Ver planes</Link>
      </header>}
      {current === null && <p className="status-message" role="status">Cargando perfil…</p>}
      {current?.error && <div className="status-message status-message--error" role="alert"><p>{current.error}</p><button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
      {current && !current.error && <>
        <section className="author-profile__section" aria-labelledby="author-articles">
          <div className="author-profile__section-heading"><h2 id="author-articles">Ensayos publicados</h2><span>{current.total} {current.total === 1 ? 'ensayo' : 'ensayos'}</span></div>
          {current.articles.length ? <ul className="author-profile__essays">{current.articles.map((article) => <li key={article.id}>
            <Link to={`/articles/${article.id}`} aria-label={`Leer “${article.title}”`}><EssayCover article={article} /></Link>
            <h3><Link to={`/articles/${article.id}`}>{article.title}</Link></h3>
            {article.publishedAt && <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(article.publishedAt))}</time>}
          </li>)}</ul> : <p>Este autor aún no tiene ensayos publicados disponibles.</p>}
          {current.total > EXPLORE_PAGE_SIZE && <nav className="author-profile__pagination" aria-label="Paginación de ensayos del autor">
            <button type="button" className="button button--secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <span>Página {page} de {pages}</span>
            <button type="button" className="button button--secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
          </nav>}
        </section>
        <section className="author-profile__section" aria-labelledby="author-lists">
          <div className="author-profile__section-heading"><h2 id="author-lists">Listas de lectura públicas</h2></div>
          {current.lists.length ? <ul className="author-profile__reading-lists">{current.lists.map((list) => <li key={list.id}>{list.name}</li>)}</ul> : <p>Este autor aún no tiene listas de lectura públicas.</p>}
        </section>
      </>}
    </main>
  )
}

function ProfileUnavailable() {
  return (
    <main className="page-shell author-profile">
      <article className="author-profile__card">
        <h1>Perfil no encontrado</h1>
        <p className="author-profile__bio">Este perfil no existe o ya no está disponible.</p>
        <Link className="button button--secondary" to="/articles">Ver ensayos</Link>
      </article>
    </main>
  )
}

export function AuthorProfilePage() {
  const { id } = useParams()
  const profileId = Number(id)
  if (!Number.isSafeInteger(profileId) || profileId < 1) return <ProfileUnavailable />
  return <AuthorProfile key={profileId} id={profileId} />
}
