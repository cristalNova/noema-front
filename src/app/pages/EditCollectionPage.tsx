import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMyProfile } from '@/features/profiles'
import { getCollection, updateCollection, type CollectionOption } from '@/features/articles/api/collectionsApi'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { CollectionForm } from './CollectionForm'
import './CollectionsPage.css'

export function EditCollectionPage() {
  const { id } = useParams()
  const collectionId = Number(id)
  if (!Number.isSafeInteger(collectionId) || collectionId < 1) {
    return <main className="page-shell collection-form-page"><Link className="back-link" to="/app/collections">← Mis colecciones</Link><p role="alert">La colección solicitada no es válida.</p></main>
  }
  return <EditCollection key={collectionId} collectionId={collectionId} />
}

function EditCollection({ collectionId }: { collectionId: number }) {
  const { profile } = useMyProfile()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<CollectionOption | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [settledAttempt, setSettledAttempt] = useState(-1)
  const loading = settledAttempt !== attempt

  useEffect(() => {
    const controller = new AbortController()
    getCollection(collectionId, controller.signal).then((found) => {
      if (controller.signal.aborted) return
      setCollection(found)
      setError(null)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason)
    }).finally(() => {
      if (!controller.signal.aborted) setSettledAttempt(attempt)
    })
    return () => controller.abort()
  }, [collectionId, attempt])

  const back = <Link className="back-link" to={`/app/collections/${collectionId}`}>← Volver a la colección</Link>
  if (loading) return <main className="page-shell collection-form-page"><Link className="back-link" to="/app/collections">← Mis colecciones</Link><p role="status" className="status-message">Cargando colección…</p></main>
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="page-shell collection-form-page"><Link className="back-link" to="/app/collections">← Mis colecciones</Link>
        <div role="alert" className="status-message status-message--error">
          <p>{notFound ? 'Esta colección no existe o ya no está disponible.' : getErrorMessage(error)}</p>
          {!notFound && <button type="button" className="button button--secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}
        </div>
      </main>
    )
  }
  if (!collection) return null
  if (profile?.id !== collection.authorId) {
    return (
      <main className="page-shell collection-form-page"><Link className="back-link" to="/app/collections">← Mis colecciones</Link>
        <header className="page-header"><p className="eyebrow">Noema · Espacio de escritura</p><h1>Esta colección no es tuya</h1><p role="alert">Solo su autor puede editarla.</p></header>
      </main>
    )
  }

  return (
    <main className="page-shell collection-form-page">
      {back}
      <header className="page-header">
        <p className="eyebrow">Noema · Espacio de escritura</p>
        <h1>Editar colección</h1>
        <p>Actualiza el título y la descripción. Los ensayos de la colección no cambian.</p>
      </header>
      <CollectionForm
        heading="Datos de la colección"
        submitLabel="Guardar cambios"
        initial={{ title: collection.title, description: collection.description ?? '' }}
        cancelTo={`/app/collections/${collectionId}`}
        onSubmit={async (values) => {
          const saved = await updateCollection(collectionId, values)
          navigate(`/app/collections/${collectionId}`, { replace: true, state: { notice: `Se guardaron los cambios en “${saved.title}”.` } })
        }}
      />
    </main>
  )
}
