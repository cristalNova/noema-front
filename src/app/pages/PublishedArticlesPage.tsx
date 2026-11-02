import { Link } from 'react-router-dom'
import { ArticleStatusBadge } from '../../features/articles/components/ArticleStatusBadge'
import { usePublishedArticles } from '../../features/articles/hooks/usePublishedArticles'
import './PublishedArticlesPage.css'

export function PublishedArticlesPage() {
  const list = usePublishedArticles()
  return (
    <main className="page-shell published-page">
      <header className="page-header">
        <p className="eyebrow">Noema · Lecturas</p>
        <h1>Ensayos publicados</h1>
        <p>Ideas que sus autores han decidido compartir. Aquí aparecen los ensayos publicados a los que tienes acceso.</p>
        <Link className="button button--secondary" to="/app/articles">Mis ensayos</Link>
      </header>
      {list.isLoading && <p className="status-message" role="status">Cargando ensayos publicados…</p>}
      {!list.isLoading && list.error && <div className="status-message status-message--error" role="alert"><p>{list.error}</p><button type="button" className="button button--secondary" onClick={list.retry}>Reintentar</button></div>}
      {!list.isLoading && !list.error && <>
        {list.articles.length === 0 ? <p className="status-message">Todavía no hay ensayos publicados disponibles.</p> : <div className="published-list">{list.articles.map((article) => <article key={article.id} className="published-essay"><div className="published-essay__badges"><ArticleStatusBadge status={article.status} />{article.isPremium && <span className="premium-badge">Premium</span>}</div><h2>{article.title}</h2><p>{article.description || 'El autor aún no ha añadido una descripción.'}</p></article>)}</div>}
        {list.total > 0 && <nav className="pagination" aria-label="Paginación de ensayos publicados"><button type="button" className="button button--secondary" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>Anterior</button><span>Página {list.page} de {list.totalPages} · {list.total} {list.total === 1 ? 'ensayo' : 'ensayos'}</span><button type="button" className="button button--secondary" disabled={list.page >= list.totalPages} onClick={() => list.setPage(list.page + 1)}>Siguiente</button></nav>}
      </>}
    </main>
  )
}
