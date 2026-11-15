import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useRequireAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profiles'
import { useReactions } from '../hooks/useReactions'
import { EMPTY_SUMMARY, REACTIONS, type ReactionTargetType, type ReactionType } from '../model/reactions'
import './ReactionBar.css'

interface ReactionBarProps {
  target: ReactionTargetType
  targetId: number
  /** Para el lector de pantalla: "Reacciones a este ensayo". */
  subject: string
  /** Muestra el nombre de cada reacción junto al ícono (en el ensayo hay espacio de sobra). */
  showLabels?: boolean
}

const numberFormatter = new Intl.NumberFormat('es-CO')
const SPARKLES = [0, 60, 120, 180, 240, 300]
const iconUrl = (icon: string, extension: 'png' | 'gif') => `${import.meta.env.BASE_URL}reactions/${icon}.${extension}`

function ReactionBarContent({ target, targetId, subject, showLabels = false }: ReactionBarProps) {
  const requireAuth = useRequireAuth()
  const { status: profileStatus } = useMyProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, loadError, actionError, react, retry } = useReactions(target, targetId)
  const shown = summary ?? EMPTY_SUMMARY
  // La reacción recién puesta: su GIF se reproduce desde el principio y una copia salta fuera del botón.
  const [burst, setBurst] = useState<{ type: ReactionType; id: number } | null>(null)
  const bursts = useRef(0)

  useEffect(() => {
    if (!burst) return
    const playMs = REACTIONS.find(({ type }) => type === burst.type)?.playMs ?? 2000
    const timer = window.setTimeout(() => setBurst(null), playMs)
    return () => window.clearTimeout(timer)
  }, [burst])

  function pick(type: ReactionType) {
    // Sin sesión, se lleva a iniciar sesión; con sesión pero sin perfil, a crearlo.
    if (!requireAuth('reaccionar a este contenido')) return
    if (profileStatus === 'missing') {
      navigate('/profile/new', { state: { from: location.pathname + location.search } })
      return
    }
    // Solo al poner una reacción (no al quitarla) y si la persona no pidió menos movimiento.
    if (shown.mine !== type && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setBurst({ type, id: ++bursts.current })
    else setBurst(null)
    react(type)
  }

  return (
    <div className="reactions">
      <div className="reactions__group" role="group" aria-label={subject} aria-busy={!summary && !loadError}>
        {REACTIONS.map(({ type, icon, label }) => {
          const active = shown.mine === type
          const playing = burst?.type === type
          return (
            <button
              key={type}
              type="button"
              className={active ? 'reaction reaction--active' : 'reaction'}
              aria-pressed={active}
              disabled={!summary}
              title={label}
              onClick={() => pick(type)}
            >
              {/* Quieto por defecto; al reaccionar se reproduce el GIF (con key nuevo, para que arranque desde el primer cuadro). */}
              <span className="reaction__icon" aria-hidden="true">
                <img key={playing ? burst.id : 'still'} className="reaction__img" src={iconUrl(icon, playing ? 'gif' : 'png')} alt="" width="96" height="96" />
                {playing && (
                  <span className="reaction__fx">
                    <img className="reaction__fx-img" src={iconUrl(icon, 'gif')} alt="" width="96" height="96" />
                    {SPARKLES.map((angle) => <i key={angle} style={{ '--angle': `${angle}deg` } as React.CSSProperties} />)}
                  </span>
                )}
              </span>
              <span className={showLabels ? 'reaction__label' : 'reaction__sr'}>{label}</span>
              <span className="reaction__count">{numberFormatter.format(shown.byType[type])}</span>
            </button>
          )
        })}
      </div>
      {loadError && (
        <p className="reactions__note">
          No se pudieron cargar las reacciones. <button type="button" onClick={retry}>Reintentar</button>
        </p>
      )}
      {actionError && <p className="reactions__error" role="alert">{actionError}</p>}
    </div>
  )
}

/** Se remonta al cambiar de contenido o de sesión: `mine` depende de quién mira. */
export function ReactionBar(props: ReactionBarProps) {
  const { session } = useAuth()
  return <ReactionBarContent key={`${props.target}:${props.targetId}:${session?.user.id ?? 'visitor'}`} {...props} />
}
