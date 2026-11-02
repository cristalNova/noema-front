import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityFilters } from '../../features/communities/components/CommunityFilters'
import { CommunityList } from '../../features/communities/components/CommunityList'
import { CommunityPagination } from '../../features/communities/components/CommunityPagination'
import { useCommunities } from '../../features/communities/hooks/useCommunities'
import { getErrorMessage } from '../../shared/api/apiError'

export function CommunitiesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const {
    communities,
    total,
    currentPage,
    limit,
    isLoading,
    error,
    setPage,
    resetPage,
    retryRequest,
  } = useCommunities(search)
  const errorMessage = error ? getErrorMessage(error) : ''

  const submitSearch = () => {
    const nextSearch = searchInput.trim()
    setSearch(nextSearch)
    resetPage()
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Noema · Comunidades</p>
        <h1>Explora comunidades</h1>
        <p>Encuentra espacios para compartir tus intereses, lecturas e ideas.</p>
        <CommunityFilters value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} />
        <Link className="button button--primary communities-page__create-link" to="/communities/new">
          Crear comunidad
        </Link>
      </header>

      {isLoading && <p className="status-message" role="status">Cargando comunidades…</p>}
      {errorMessage && (
        <div className="status-message status-message--error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="button button--secondary" onClick={retryRequest}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && communities.length === 0 && (
        <p className="status-message">
          {search ? `No encontramos comunidades para “${search}”.` : 'Todavía no hay comunidades disponibles.'}
        </p>
      )}
      {!error && communities.length > 0 && <CommunityList communities={communities} />}
      {!error && total > 0 && (
        <CommunityPagination page={currentPage} total={total} limit={limit} onPageChange={setPage} />
      )}
    </main>
  )
}
