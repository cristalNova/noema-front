import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMyProfile } from '@/features/profiles'
import { getCommunity, replaceCommunityTags, updateCommunity } from '@/features/communities/api/communitiesApi'
import { CommunityForm, type CommunityFormValues } from '@/features/communities/components/CommunityForm'
import type { CommunityDetail } from '@/features/communities/model/community.types'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'

const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && [...a].map((tag) => tag.toLowerCase()).sort().join('\n') === [...b].map((tag) => tag.toLowerCase()).sort().join('\n')

function sameDetails(community: CommunityDetail, values: CommunityFormValues) {
  return community.name === values.name &&
    community.topic === values.topic &&
    (community.description ?? '') === values.description &&
    community.isPremium === values.isPremium
}

export function EditCommunityPage() {
  const { id } = useParams()
  const communityId = Number(id)
  if (!Number.isSafeInteger(communityId) || communityId < 1) {
    return <main className="page-shell"><p className="status-message status-message--error" role="alert">La comunidad solicitada no es válida.</p><Link className="back-link" to="/communities">← Volver a comunidades</Link></main>
  }
  return <CommunityEditor key={communityId} communityId={communityId} />
}

function CommunityEditor({ communityId }: { communityId: number }) {
  const navigate = useNavigate()
  const { profile } = useMyProfile()
  const [community, setCommunity] = useState<CommunityDetail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [settledAttempt, setSettledAttempt] = useState(-1)
  const loading = settledAttempt !== attempt
  // Etiquetas ya guardadas en el servidor: evita repetir el PUT si solo falló un paso anterior.
  const savedTags = useRef<string[]>([])
  const backTo = `/communities/${communityId}`

  useEffect(() => {
    const controller = new AbortController()
    getCommunity(communityId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      savedTags.current = result.tags.map(({ tag }) => tag)
      setCommunity(result)
      setError(null)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason)
    }).finally(() => {
      if (!controller.signal.aborted) setSettledAttempt(attempt)
    })
    return () => controller.abort()
  }, [communityId, attempt])

  async function save(values: CommunityFormValues) {
    // Se envía la descripción aunque esté vacía: así también se puede borrar.
    if (!sameDetails(community!, values)) {
      await updateCommunity(communityId, { name: values.name, topic: values.topic, description: values.description, isPremium: values.isPremium })
    }
    if (!sameTags(values.tags, savedTags.current)) {
      try {
        savedTags.current = await replaceCommunityTags(communityId, values.tags)
      } catch (reason) {
        throw new Error(`Los datos se guardaron, pero las etiquetas no: ${getErrorMessage(reason)} Vuelve a guardar para reintentarlo.`, { cause: reason })
      }
    }
    navigate(`${backTo}?updated=1`)
  }

  if (loading) return <main className="page-shell"><p className="status-message" role="status">Cargando comunidad…</p></main>
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="page-shell">
        <Link className="back-link" to="/communities">← Volver a comunidades</Link>
        <div className="status-message status-message--error" role="alert">
          <p>{notFound ? 'Esta comunidad no existe o ya no está disponible.' : getErrorMessage(error)}</p>
          {!notFound && <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}
        </div>
      </main>
    )
  }
  if (!community) return null

  // El backend rechaza con 403 a cualquiera que no sea el propietario; aquí se evita ofrecer el formulario.
  if (profile?.id !== community.ownerId) {
    return (
      <main className="page-shell">
        <Link className="back-link" to={backTo}>← Volver a la comunidad</Link>
        <header className="page-header">
          <p className="eyebrow">Noema · Comunidades</p>
          <h1>No puedes editar esta comunidad</h1>
          <p role="alert">Solo el propietario de la comunidad puede modificar su nombre, temática, descripción y etiquetas.</p>
        </header>
        <Link className="button button--primary" to={backTo}>Ver la comunidad</Link>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <Link className="back-link" to={backTo}>← Volver a la comunidad</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1>Editar comunidad</h1>
        <p>Actualiza lo que verán quienes llegan a {community.name}.</p>
      </header>
      <CommunityForm
        mode="edit"
        initialValues={{ name: community.name, topic: community.topic, description: community.description ?? '', isPremium: community.isPremium, tags: community.tags.map(({ tag }) => tag) }}
        onSubmit={save}
        onCancel={() => navigate(backTo)}
      />
    </main>
  )
}
