import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getReturnTo } from '@/shared/utils/navigation'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { ProfileForm, useMyProfile, type Profile } from '@/features/profiles'
import { AuthLayout } from '../layout/AuthLayout'

export default function ProfileNewPage() {
  const { status, setProfile } = useMyProfile()
  const navigate = useNavigate()
  const location = useLocation()
  // Evita que, al quedar el perfil "ready", este guard nos mande a "/" en vez del onboarding.
  const [created, setCreated] = useState(false)

  if (status === 'idle' || status === 'loading') return <LoadingScreen />
  if (status === 'ready' && !created) return <Navigate to={getReturnTo(location.state)} replace />

  function handleCreated(profile: Profile) {
    setCreated(true)
    setProfile(profile)
    navigate(getReturnTo(location.state, '/onboarding/interests'), { replace: true })
  }

  return (
    <AuthLayout
      heading="Cuéntanos quién eres"
      title="Crea tu perfil"
      footer="Podrás editar tu perfil más adelante."
    >
      <ProfileForm onCreated={handleCreated} />
    </AuthLayout>
  )
}
