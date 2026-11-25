import type { PostFilters as Filters } from '../model/posts'
import { usePostFilterOptions } from '../hooks/usePostFilterOptions'
import './PostFilters.css'

interface PostFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

function toValue(value: string): number | undefined {
  return value ? Number(value) : undefined
}

export function PostFilters({ filters, onChange }: PostFiltersProps) {
  const { authors, communities, canFilterByCommunity, hasError } = usePostFilterOptions()
  const { authorId, communityId } = filters
  // Un filtro llegado por URL puede no estar entre las opciones (o estas aún no han cargado).
  const isUnknownAuthor = authorId !== undefined && !authors.some((author) => author.id === authorId)
  const isUnknownCommunity = communityId !== undefined && !communities.some((community) => community.id === communityId)

  return (
    <form className="post-filters" aria-label="Filtrar publicaciones" onSubmit={(event) => event.preventDefault()}>
      <label className="post-filters__field">
        Autor
        <select value={authorId ?? ''} onChange={(event) => onChange({ ...filters, authorId: toValue(event.target.value) })}>
          <option value="">Todos los autores</option>
          {isUnknownAuthor && <option value={authorId}>Autor #{authorId}</option>}
          {authors.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
        </select>
      </label>
      <label className="post-filters__field">
        Comunidad
        <select
          value={communityId ?? ''}
          disabled={!canFilterByCommunity && communityId === undefined}
          aria-describedby={canFilterByCommunity ? undefined : 'post-filters-community-hint'}
          onChange={(event) => onChange({ ...filters, communityId: toValue(event.target.value) })}
        >
          <option value="">Todas las comunidades</option>
          {isUnknownCommunity && <option value={communityId}>Comunidad #{communityId}</option>}
          {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
        </select>
      </label>
      {(authorId !== undefined || communityId !== undefined) && (
        <button type="button" className="post-filters__clear" onClick={() => onChange({})}>Quitar filtros</button>
      )}
      {!canFilterByCommunity && <p className="post-filters__note" id="post-filters-community-hint">Inicia sesión para filtrar por tus comunidades.</p>}
      {hasError && <p className="post-filters__note" role="status">No pudimos cargar todas las opciones de filtro.</p>}
    </form>
  )
}
