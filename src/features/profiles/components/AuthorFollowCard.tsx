import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { profilesApi } from '../api/profilesApi'
import type { Profile } from '../model/Profile'
import { FollowControl } from './FollowControl'

/** La lista de ensayos trae authorId; consulta el perfil para mostrar autor y seguimiento. */
export function AuthorFollowCard({ authorId }: { authorId: number }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    profilesApi.getById(authorId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setProfile(result) })
      .catch(() => { /* El enlace al perfil sigue disponible. */ })
    return () => controller.abort()
  }, [authorId])

  return <div className="published-essay__author-card">
    <Link to={`/profiles/${authorId}`} className="published-essay__author">{profile?.name ?? 'Ver perfil del autor'} ↗</Link>
    {profile && <FollowControl key={profile.id} profileId={profile.id} followersCount={profile.followersCount} compact />}
  </div>
}
