import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '@/shared/components/Pagination'
import { LeaveCommunityDialog } from '@/features/communities/components/LeaveCommunityDialog'
import { MyCommunityCard } from '@/features/communities/components/MyCommunityCard'
import { useLeaveCommunity } from '@/features/communities/hooks/useLeaveCommunity'
import { useMyCommunities } from '@/features/communities/hooks/useMyCommunities'
import type { MyCommunity } from '@/features/communities/model/myCommunity'

export function MyCommunitiesPage() {
  const list = useMyCommunities()
  const leave = useLeaveCommunity()
  const [leaving, setLeaving] = useState<MyCommunity | null>(null)
  const [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  async function confirmLeave(community: MyCommunity): Promise<string | null> {
    const reason = await leave(community.id)
    if (reason) return reason
    list.remove(community.id)
    setNotice(`Saliste de “${community.name}”.`)
    return null
  }

  function closeDialog() {
    setLeaving(null)
    // La tarjeta de la que se salió ya no existe: el foco pasa al título.
    requestAnimationFrame(() => heading.current?.focus())
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1 ref={heading} tabIndex={-1}>Mis comunidades</h1>
        <p>Los espacios a los que perteneces. Puedes salir de los que ya no te interesen.</p>
      </header>

      <p className="status-message" role="status" hidden={!notice}>
        {notice}
      </p>

      {list.isLoading && (
        <p className="status-message" role="status">
          Cargando tus comunidades…
        </p>
      )}
      {!list.isLoading && list.error && (
        <div className="status-message status-message--error" role="alert">
          <p>{list.error}</p>
          <button type="button" className="button button--secondary" onClick={list.reload}>
            Reintentar
          </button>
        </div>
      )}
      {!list.isLoading && !list.error && list.total === 0 && (
        <div className="status-message">
          <p>Aún no perteneces a ninguna comunidad.</p>
          <Link className="button button--primary" to="/communities">
            Explorar comunidades
          </Link>
        </div>
      )}
      {!list.isLoading && !list.error && list.communities.length > 0 && (
        <div className="community-grid">
          {list.communities.map((community) => (
            <MyCommunityCard key={community.id} community={community} onLeave={setLeaving} />
          ))}
        </div>
      )}
      {!list.isLoading && !list.error && list.total > list.limit && (
        <Pagination page={list.page} total={list.total} limit={list.limit} label="Paginación de mis comunidades" onPageChange={list.setPage} />
      )}

      {leaving && (
        <LeaveCommunityDialog communityName={leaving.name} onClose={closeDialog} onConfirm={() => confirmLeave(leaving)} />
      )}
    </main>
  )
}
