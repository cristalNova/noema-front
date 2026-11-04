import { useNavigate } from 'react-router-dom'
import { createCommunity } from '../../features/communities/api/communitiesApi'
import { CommunityForm, type CommunityFormValues } from '../../features/communities/components/CommunityForm'

export function CreateCommunityPage() {
  const navigate = useNavigate()

  async function create(values: CommunityFormValues) {
    const community = await createCommunity({
      name: values.name,
      topic: values.topic,
      ...(values.description ? { description: values.description } : {}),
      isPremium: values.isPremium,
      ...(values.tags.length > 0 ? { tags: values.tags } : {}),
    })
    navigate(`/communities/${community.id}`)
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1>Crea tu comunidad</h1>
        <p>Abre un espacio para conversar sobre lo que te importa.</p>
      </header>
      <CommunityForm mode="create" onSubmit={create} onCancel={() => navigate('/communities')} />
    </main>
  )
}
