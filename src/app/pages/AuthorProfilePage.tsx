import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { profilesApi, type Profile } from '@/features/profiles'
import { getErrorMessage, toApiError } from '@/shared/api/apiError'
import './AuthorProfilePage.css'

interface Settled {
  attempt: number
  profile: Profile | null
  error: string
  isUnavailable: boolean
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function AuthorProfile({ id }: { id: number }) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    profilesApi.getById(id, controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) setSettled({ attempt, profile, error: '', isUnavailable: false })
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ attempt, profile: null, error: getErrorMessage(reason), isUnavailable: toApiError(reason).status === 404 })
      })
    return () => controller.abort()
  }, [id, attempt])

  const current = settled?.attempt === attempt ? settled : null

  if (current?.isUnavailable) return <ProfileUnavailable />

  return (
    <main className="page-shell author-profile">
      {current === null && <p className="status-message" role="status">Cargando perfil…</p>}
      {current?.error && (
        <div className="status-message status-message--error" role="alert">
          <p>{current.error}</p>
          <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>
        </div>
      )}
      {current?.profile && (
        <article className="author-profile__card">
          {current.profile.photoUrl
            ? <img className="author-profile__avatar" src={current.profile.photoUrl} alt="" />
            : <span className="author-profile__avatar" aria-hidden="true">{initials(current.profile.name)}</span>}
          <h1>{current.profile.name}</h1>
          <p className="author-profile__username">@{current.profile.username}</p>
          {current.profile.bio && <p className="author-profile__bio">{current.profile.bio}</p>}
          <Link className="button button--primary" to={`/profiles/${id}/plans`}>Ver planes</Link>
        </article>
      )}
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
