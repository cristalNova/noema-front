import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '../hooks/useMyProfile'
import { followProfile, listFollowing, unfollowProfile } from '../api/followsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './FollowControl.css'

const CHANGE_EVENT = 'noema:follow-change'
type FollowChange = { profileId: number; following: boolean; count: number }

export function FollowControl({ profileId, followersCount, compact = false, onShowFollowers }: { profileId: number; followersCount: number; compact?: boolean; onShowFollowers?: () => void }) {
  const { isAuthenticated } = useAuth()
  const { profile: mine, status } = useMyProfile()
  const myId = mine?.id
  const [following, setFollowing] = useState<boolean | null>(null)
  const [count, setCount] = useState(followersCount)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !myId || myId === profileId) return
    const controller = new AbortController()
    listFollowing(myId, controller.signal)
      .then((profiles) => {
        if (!controller.signal.aborted) {
          setFollowing(profiles.some((item) => item.id === profileId))
          setError('')
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason))
      })
    return () => controller.abort()
  }, [isAuthenticated, myId, profileId, attempt])

  useEffect(() => {
    const sync = (event: Event) => {
      const change = (event as CustomEvent<FollowChange>).detail
      if (change.profileId === profileId) {
        setFollowing(change.following)
        setCount(change.count)
      }
    }
    window.addEventListener(CHANGE_EVENT, sync)
    return () => window.removeEventListener(CHANGE_EVENT, sync)
  }, [profileId])

  async function toggle() {
    if (following === null || pending) return
    const wasFollowing = following
    const previousCount = count
    const nextFollowing = !wasFollowing
    const nextCount = Math.max(0, count + (nextFollowing ? 1 : -1))
    setFollowing(nextFollowing)
    setCount(nextCount)
    setError('')
    setPending(true)
    window.dispatchEvent(new CustomEvent<FollowChange>(CHANGE_EVENT, { detail: { profileId, following: nextFollowing, count: nextCount } }))
    try {
      if (nextFollowing) await followProfile(profileId)
      else await unfollowProfile(profileId)
    } catch (reason) {
      setFollowing(wasFollowing)
      setCount(previousCount)
      setError(`No se pudo actualizar el seguimiento. ${getErrorMessage(reason)}`)
      window.dispatchEvent(new CustomEvent<FollowChange>(CHANGE_EVENT, { detail: { profileId, following: wasFollowing, count: previousCount } }))
    } finally {
      setPending(false)
    }
  }

  return <div className={`follow-control${compact ? ' follow-control--compact' : ''}`}>
    {onShowFollowers
      ? <button type="button" className="follow-control__count follow-control__count--button" aria-haspopup="dialog" aria-live="polite" onClick={onShowFollowers}>{count} {count === 1 ? 'seguidor' : 'seguidores'}</button>
      : <span className="follow-control__count" aria-live="polite">{count} {count === 1 ? 'seguidor' : 'seguidores'}</span>}
    {mine?.id === profileId ? null
      : !isAuthenticated ? <Link className="button button--secondary" to="/login" state={{ from: `/profiles/${profileId}` }}>Seguir</Link>
      : status === 'missing' ? <Link className="button button--secondary" to="/profile/new" state={{ from: `/profiles/${profileId}` }}>Seguir</Link>
      : status === 'ready' && mine && (
        following === null
          ? <button type="button" className="button button--secondary" disabled>Cargando seguimiento…</button>
          : <button type="button" className={`button ${following ? 'button--secondary' : 'button--primary'}`} aria-pressed={following} disabled={pending} onClick={() => void toggle()}>{following ? 'Siguiendo' : 'Seguir'}</button>
      )}
    {error && <div className="follow-control__error" role="alert">{error}{following === null && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}</div>}
  </div>
}
