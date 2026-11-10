import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ConnectionKind } from '../hooks/useConnections'
import { useMyProfile } from '../hooks/useMyProfile'
import { ConnectionList } from './ConnectionList'
import './ConnectionsDialog.css'

interface ConnectionsDialogProps {
  profileId: number
  profileName: string
  /** Pestaña con la que se abre (por defecto, Seguidores). */
  initialTab?: ConnectionKind
  onClose: () => void
}

const TABS: { kind: ConnectionKind; label: string }[] = [
  { kind: 'followers', label: 'Seguidores' },
  { kind: 'following', label: 'Siguiendo' },
]

/** Ventana emergente con las pestañas "Seguidores" y "Siguiendo" de un perfil. */
export function ConnectionsDialog({ profileId, profileName, initialTab = 'followers', onClose }: ConnectionsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const tablist = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ConnectionKind>(initialTab)
  const { profile: mine } = useMyProfile()

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    // El foco empieza en la pestaña activa, no en el botón de cerrar.
    element?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus()
    return () => element?.close()
  }, [])

  // Patrón de pestañas WAI-ARIA: flechas, Inicio y Fin mueven el foco y la selección.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1
    const target =
      event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (target === null) return
    event.preventDefault()
    setActive(TABS[target].kind)
    tablist.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus()
  }

  return (
    <dialog
      ref={dialog}
      className="connections-dialog"
      aria-labelledby="connections-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="connections-dialog__body">
        <header className="connections-dialog__header">
          <h2 id="connections-title">{profileName}</h2>
          <button type="button" className="connections-dialog__close" aria-label="Cerrar" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="connections-dialog__tabs" role="tablist" aria-label="Seguidores y seguidos" ref={tablist}>
          {TABS.map(({ kind, label }, index) => (
            <button
              key={kind}
              type="button"
              role="tab"
              id={`connections-tab-${kind}`}
              aria-selected={active === kind}
              aria-controls="connections-panel"
              tabIndex={active === kind ? 0 : -1}
              className="connections-dialog__tab"
              onClick={() => setActive(kind)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {label}
            </button>
          ))}
        </div>

        <div id="connections-panel" role="tabpanel" aria-labelledby={`connections-tab-${active}`} className="connections-dialog__panel">
          <ConnectionList
            key={`${profileId}:${active}`}
            profileId={profileId}
            profileName={profileName}
            kind={active}
            isOwn={mine?.id === profileId}
            onNavigate={onClose}
          />
        </div>
      </div>
    </dialog>
  )
}
