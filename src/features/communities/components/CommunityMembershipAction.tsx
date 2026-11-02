import { Button } from '@/shared/components/Button'
import { useCommunityMembership } from '../hooks/useCommunityMembership'
import type { Community } from '../model/community.types'
import './CommunityMembershipAction.css'

interface CommunityMembershipActionProps {
  community: Community
}

export function CommunityMembershipAction({ community }: CommunityMembershipActionProps) {
  const { state, errorMessage, join, leave, retry } = useCommunityMembership(community)

  if (state === 'PENDING') {
    return (
      <div className="membership-action">
        <p className="membership-action__pending" role="status" aria-live="polite">
          <span aria-hidden="true">◷</span> Solicitud pendiente de aprobación
        </p>
      </div>
    )
  }

  if (state === 'BANNED') {
    return <p className="membership-action__error" role="alert">Tu acceso a esta comunidad está restringido.</p>
  }

  if (state === 'ERROR') {
    return (
      <div className="membership-action">
        <p className="membership-action__error" role="alert">{errorMessage}</p>
        <Button type="button" onClick={retry}>Reintentar</Button>
      </div>
    )
  }

  if (state === 'LOADING') {
    return (
      <div className="membership-action" aria-live="polite">
        <Button type="button" loading disabled>Procesando…</Button>
      </div>
    )
  }

  if (state === 'ACTIVE') {
    return (
      <div className="membership-action">
        <Button type="button" data-variant="leave" onClick={() => void leave}>
          Salir
        </Button>
      </div>
    )
  }

  return (
    <div className="membership-action">
      <Button type="button" onClick={() => void join}>Unirme</Button>
    </div>
  )
}
