import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteCommunity, listMyCommunities, type MyCommunityMembership } from '@/features/communities/api/communitiesApi'
import { CommunityCard } from '@/features/communities/components/CommunityCard'
import { DeleteCommunityDialog } from '@/features/communities/components/DeleteCommunityDialog'
import { LeaveCommunityDialog } from '@/features/communities/components/LeaveCommunityDialog'
import { useLeaveCommunity } from '@/features/communities/hooks/useLeaveCommunity'
import { getErrorMessage } from '@/shared/api/apiError'
import { Pagination } from '@/shared/components/Pagination'
import './MyCommunitiesPage.css'

const LIMIT = 20

export function MyCommunitiesPage() {
  const [items, setItems] = useState<MyCommunityMembership[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<MyCommunityMembership | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const leave = useLeaveCommunity()
  const [leaving, setLeaving] = useState<MyCommunityMembership | null>(null)

  useEffect(() => {
    let active = true
    // The effect owns request lifecycle state after page or retry changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    listMyCommunities({ page, limit: LIMIT })
      .then((result) => {
        if (!active) return
        setItems(result.data)
        setTotal(result.total)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [page, retry])

  function openDelete(item: MyCommunityMembership) {
    setDeleteError('')
    setSelected(item)
  }

  async function confirmDelete(): Promise<boolean> {
    if (!selected || deletingId !== null) return false
    const id = selected.community.id
    setDeletingId(id)
    setDeleteError('')
    try {
      await deleteCommunity(id)
      setItems((current) => current.filter((item) => item.community.id !== id))
      setTotal((current) => current - 1)
      setSelected(null)
      setAnnouncement(`Comunidad ${selected.community.name} eliminada correctamente.`)
      if (items.length === 1 && page > 1) setPage((current) => current - 1)
      return true
    } catch (reason: unknown) {
      setDeleteError(getErrorMessage(reason))
      return false
    } finally {
      setDeletingId(null)
    }
  }

  // Salir: el motivo de un rechazo del servidor (p. ej. ser propietario) se muestra dentro del diálogo.
  async function confirmLeave(item: MyCommunityMembership): Promise<string | null> {
    const id = item.community.id
    const reason = await leave(id)
    if (reason) return reason
    setItems((current) => current.filter((entry) => entry.community.id !== id))
    setTotal((current) => current - 1)
    setAnnouncement(`Saliste de la comunidad ${item.community.name}.`)
    if (items.length === 1 && page > 1) setPage((current) => current - 1)
    return null
  }

  return (
    <main className="page-shell my-communities">
      <header className="page-header">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1>Mis comunidades</h1>
        <p>Gestiona las comunidades a las que perteneces.</p>
      </header>

      {announcement && <p className="status-message my-communities__success" role="status">{announcement}</p>}
      {isLoading && <p className="status-message" role="status">Cargando tus comunidades…</p>}
      {error !== null && !isLoading && (
        <div className="status-message status-message--error" role="alert">
          <p>{getErrorMessage(error)}</p>
          <button type="button" className="button button--secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && items.length === 0 && (
        <div className="status-message">
          <p>No perteneces a ninguna comunidad todavía.</p>
          <Link className="button button--primary" to="/communities">Descubrir comunidades</Link>
        </div>
      )}
      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="community-grid">
            {items.map((item) => (
              <CommunityCard
                key={item.community.id}
                community={item.community}
                role={item.role}
                deleting={deletingId === item.community.id}
                onDelete={item.role === 'OWNER' ? () => openDelete(item) : undefined}
                onLeave={item.role !== 'OWNER' ? () => setLeaving(item) : undefined}
              />
            ))}
          </div>
          <Pagination page={page} total={total} limit={LIMIT} label="Paginación de mis comunidades" onPageChange={setPage} />
        </>
      )}
      {selected && (
        <DeleteCommunityDialog
          communityName={selected.community.name}
          pending={deletingId !== null}
          error={deleteError}
          onClose={() => {
            if (deletingId === null) setSelected(null)
          }}
          onConfirm={confirmDelete}
        />
      )}
      {leaving && (
        <LeaveCommunityDialog
          communityName={leaving.community.name}
          onClose={() => setLeaving(null)}
          onConfirm={() => confirmLeave(leaving)}
        />
      )}
    </main>
  )
}
