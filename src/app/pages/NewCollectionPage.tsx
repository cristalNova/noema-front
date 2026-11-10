import { Link, useNavigate } from 'react-router-dom'
import { createCollection } from '@/features/articles/api/collectionsApi'
import { CollectionForm } from './CollectionForm'
import './CollectionsPage.css'

export function NewCollectionPage() {
  const navigate = useNavigate()

  return (
    <main className="page-shell collection-form-page">
      <Link className="back-link" to="/app/collections">← Mis colecciones</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Espacio de escritura</p>
        <h1>Crear colección</h1>
        <p>Un lugar para reunir ensayos que dialogan entre sí.</p>
      </header>
      <CollectionForm
        heading="Nueva colección"
        submitLabel="Crear colección"
        onSubmit={async (values) => {
          const created = await createCollection(values)
          navigate('/app/collections', { replace: true, state: { notice: `Se creó “${created.title}”.` } })
        }}
      />
    </main>
  )
}
