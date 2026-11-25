interface PaginationProps {
  page: number
  total: number
  limit: number
  /** Nombre accesible: describe qué se está paginando. */
  label: string
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, limit, label, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <nav className="pagination" aria-label={label}>
      <button type="button" className="button button--secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      <span>Página {page} de {totalPages} · {total} {total === 1 ? 'resultado' : 'resultados'}</span>
      <button type="button" className="button button--secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
