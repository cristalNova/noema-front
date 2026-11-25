import { useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { useLocation, useNavigate } from 'react-router-dom'

interface Props {
  active: boolean
  disabled?: boolean
  onToggle: () => void
  label?: string
}

export function FavoriteButton({ active, disabled, onToggle, label }: Props) {
  const requireAuth = useRequireAuth()
  const { status } = useMyProfile()
  const navigate = useNavigate()
  const location = useLocation()

  function click() {
    if (!requireAuth('guardar este ensayo en tus favoritos')) return
    if (status === 'missing') {
      navigate('/profile/new', { state: { from: location.pathname + location.search } })
      return
    }
    onToggle()
  }

  return <button type="button" className={`button ${active ? 'button--primary' : 'button--secondary'}`} aria-pressed={active} disabled={disabled} onClick={click}>
    {label ?? (active ? 'Quitar de favoritos' : 'Agregar a favoritos')}
  </button>
}
