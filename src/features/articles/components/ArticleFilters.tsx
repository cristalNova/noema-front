import type { FilterOptions } from '../hooks/useFilterOptions'
import type { ExploreFilters, FilterKey } from '../model/exploreFilters'
import './ArticleFilters.css'

interface ArticleFiltersProps {
  filters: ExploreFilters
  options: FilterOptions
  onChange: (patch: Partial<ExploreFilters>) => void
  onClear: () => void
}

const SELECT_IDS: Record<FilterKey, string> = {
  tag: 'explore-tag-all',
  communityId: 'explore-community',
  authorId: 'explore-author',
  collectionId: 'explore-collection',
}

const toId = (value: string): number | null => (value === '' ? null : Number(value))

export function ArticleFilters({ filters, options, onChange, onClear }: ArticleFiltersProps) {
  const tags = options.tags.data
  const communities = options.communities.data
  const authors = options.authors.data
  const allCollections = options.collections.data

  const authorName = (id: number) => authors.find((author) => author.id === id)?.name
  // Con un autor elegido solo se ofrecen sus colecciones
  const collections = filters.authorId === null ? allCollections : allCollections.filter((collection) => collection.authorId === filters.authorId)

  const chips: { key: FilterKey; group: string; label: string }[] = []
  if (filters.tag) chips.push({ key: 'tag', group: 'Etiqueta', label: `#${filters.tag}` })
  if (filters.communityId !== null) {
    chips.push({ key: 'communityId', group: 'Comunidad', label: communities.find((c) => c.id === filters.communityId)?.name ?? `Comunidad #${filters.communityId}` })
  }
  if (filters.authorId !== null) chips.push({ key: 'authorId', group: 'Autor', label: authorName(filters.authorId) ?? `Autor #${filters.authorId}` })
  if (filters.collectionId !== null) {
    chips.push({ key: 'collectionId', group: 'Colección', label: allCollections.find((c) => c.id === filters.collectionId)?.title ?? `Colección #${filters.collectionId}` })
  }

  function changeAuthor(value: string) {
    const authorId = toId(value)
    const current = allCollections.find((collection) => collection.id === filters.collectionId)
    // Una colección de otro autor daría siempre cero resultados: se quita
    const keepCollection = filters.collectionId !== null && (authorId === null || current?.authorId === authorId)
    onChange({ authorId, ...(keepCollection ? {} : { collectionId: null }) })
  }

  function removeFilter(key: FilterKey) {
    onChange({ [key]: null })
    // El botón de la chip desaparece: el foco pasa al filtro que acaba de quedar libre
    document.getElementById(SELECT_IDS[key])?.focus()
  }

  return (
    <section className="explore-filters" aria-label="Filtrar ensayos">
      <div className="explore-tags" role="group" aria-label="Etiquetas">
        <button type="button" id={SELECT_IDS.tag} className="button button--secondary" aria-pressed={filters.tag === null} onClick={() => onChange({ tag: null })}>Todas</button>
        {filters.tag && !tags.some((item) => item.tag === filters.tag) && (
          <button type="button" className="button button--secondary" aria-pressed="true" onClick={() => onChange({ tag: null })}>#{filters.tag}</button>
        )}
        {tags.map((item) => (
          <button key={item.tag} type="button" className="button button--secondary" aria-pressed={filters.tag === item.tag} onClick={() => onChange({ tag: filters.tag === item.tag ? null : item.tag })}>
            #{item.tag} <span>({item.articles})</span>
          </button>
        ))}
      </div>

      <div className="explore-selects">
        <div className="explore-select">
          <select id={SELECT_IDS.communityId} aria-label="Comunidad" data-active={filters.communityId !== null} value={filters.communityId ?? ''} disabled={!options.canFilterByCommunity}
            aria-describedby={options.canFilterByCommunity ? undefined : 'explore-community-hint'} onChange={(event) => onChange({ communityId: toId(event.target.value) })}>
            <option value="">Todas las comunidades</option>
            {filters.communityId !== null && !communities.some((item) => item.id === filters.communityId) && <option value={filters.communityId}>Comunidad #{filters.communityId}</option>}
            {communities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>

        <div className="explore-select">
          <select id={SELECT_IDS.authorId} aria-label="Autor" data-active={filters.authorId !== null} value={filters.authorId ?? ''} onChange={(event) => changeAuthor(event.target.value)}>
            <option value="">Todos los autores</option>
            {filters.authorId !== null && !authors.some((item) => item.id === filters.authorId) && <option value={filters.authorId}>Autor #{filters.authorId}</option>}
            {authors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>

        <div className="explore-select">
          <select id={SELECT_IDS.collectionId} aria-label="Colección" data-active={filters.collectionId !== null} value={filters.collectionId ?? ''} onChange={(event) => onChange({ collectionId: toId(event.target.value) })}>
            <option value="">Todas las colecciones</option>
            {filters.collectionId !== null && !collections.some((item) => item.id === filters.collectionId) && <option value={filters.collectionId}>Colección #{filters.collectionId}</option>}
            {collections.map((item) => {
              const author = filters.authorId === null ? authorName(item.authorId) : undefined
              return <option key={item.id} value={item.id}>{author ? `${item.title} · ${author}` : item.title}</option>
            })}
          </select>
        </div>
      </div>
      {!options.canFilterByCommunity && <p id="explore-community-hint" className="explore-filters__hint">Inicia sesión para filtrar por tus comunidades.</p>}

      {options.hasError && (
        <p className="explore-filters__notice" role="status">
          No pudimos cargar algunas opciones de filtro.{' '}
          <button type="button" className="explore-filters__clear" onClick={options.retryFailed}>Reintentar</button>
        </p>
      )}

      {chips.length > 0 && (
        <div className="explore-filters__active">
          <ul className="explore-filters__chips" aria-label="Filtros activos">
            {chips.map((chip) => (
              <li key={chip.key} className="filter-chip">
                <span className="filter-chip__group">{chip.group}</span>
                <span className="filter-chip__label">{chip.label}</span>
                <button type="button" aria-label={`Quitar filtro ${chip.group}: ${chip.label}`} onClick={() => removeFilter(chip.key)}><span aria-hidden="true">×</span></button>
              </li>
            ))}
          </ul>
          <button type="button" className="explore-filters__clear" onClick={onClear}>Limpiar filtros</button>
        </div>
      )}
    </section>
  )
}
