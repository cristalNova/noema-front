import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { toApiError } from '@/shared/api/apiError'
import { joinCommunity } from '../api/membersApi'

/** Solicita unirse sin pagar: en una comunidad premium la solicitud queda pendiente de moderación. */
export function RequestCommunityAccess({ communityId }: { communityId: number }) {
  const { isAuthenticated } = useAuth()
  const { status: profileStatus } = useMyProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const [outcome, setOutcome] = useState<'PENDING' | 'ACTIVE' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  async function request() {
    const returnState = { state: { from: location.pathname + location.search } }
    if (!isAuthenticated) return navigate('/login', returnState)
    if (profileStatus === 'missing') return navigate('/profile/new', returnState)
    if (pending.current) return
    pending.current = true
    setIsSubmitting(true)
    setError('')
    try {
      const membership = await joinCommunity(communityId)
      setOutcome(membership.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING')
    } catch (reason) {
      // Si ya existe, la respuesta dice en qué estado está: la solicitud propia no se puede consultar.
      const { status, message } = toApiError(reason)
      if (status === 409) setOutcome(/pendiente/i.test(message) ? 'PENDING' : 'ACTIVE')
      else setError(message)
    } finally {
      pending.current = false
      setIsSubmitting(false)
    }
  }

  if (outcome) {
    return <p role="status">{outcome === 'PENDING' ? 'Tu solicitud quedó pendiente de aprobación.' : 'Ya eres miembro de esta comunidad.'}</p>
  }

  return (
    <>
      <p>Puedes solicitar acceso y esperar la aprobación de la comunidad.</p>
      <button type="button" className="button button--secondary" disabled={isSubmitting} onClick={() => void request()}>
        {isSubmitting ? 'Procesando…' : 'Solicitar acceso'}
      </button>
      {error && <p className="plans-page__error" role="alert">{error}</p>}
    </>
  )
}
