interface CommunityPaginationProps {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function CommunityPagination({ page, total, limit, onPageChange }: CommunityPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <nav className="pagination" aria-label="Paginación de comunidades">
      <button type="button" className="button button--secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      <span>Página {page} de {totalPages} · {total} resultados</span>
      <button type="button" className="button button--secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
