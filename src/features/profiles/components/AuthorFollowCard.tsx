import { useEffect, useState } from 'react'
import { profilesApi } from '../api/profilesApi'
import type { Profile } from '../model/Profile'
import { FollowControl } from './FollowControl'

/** La ficha del ensayo ya muestra el autor; este control consulta su contador. */
export function AuthorFollowCard({ authorId }: { authorId: number }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    profilesApi.getById(authorId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setProfile(result) })
      .catch(() => { /* La línea de autor del ensayo sigue disponible. */ })
    return () => controller.abort()
  }, [authorId])

  if (!profile) return null
  return <div className="published-essay__author-card">
    <FollowControl profileId={profile.id} followersCount={profile.followersCount} compact />
  </div>
}
