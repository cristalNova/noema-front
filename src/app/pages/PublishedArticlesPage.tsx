import { Link } from 'react-router-dom'
import { EssayCover } from '../../features/articles/components/EssayCover'
import { useRef } from 'react'
import { ArticleFilters } from '../../features/articles/components/ArticleFilters'
import { useArticleExplorer } from '../../features/articles/hooks/useArticleExplorer'
import { useFilterOptions } from '../../features/articles/hooks/useFilterOptions'
import './PublishedArticlesPage.css'

export function PublishedArticlesPage() {
  const list = useArticleExplorer()
  const options = useFilterOptions()
  const library = useRef<HTMLElement>(null)
  const hasFilters = list.activeCount > 0
  const status = list.error && !list.isLoading ? 'error' : list.isLoading && (list.articles.length === 0 || list.error) ? 'loading' : 'ready'

  function changePage(next: number) {
    list.setPage(next)
    // El paginador queda al final del listado: se vuelve al inicio de los resultados
    library.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <main className="page-shell published-page">
      <header className="published-page__header">
        <div className="page-header">
          <p className="eyebrow">La biblioteca de Noema</p>
          <h1>Una idea lleva<br />a otra.</h1>
          <p>Ensayos para descubrir otras miradas. Abre uno y encuentra tu próxima lectura.</p>
        </div>
        <Link className="button button--secondary" to="/app/articles">Mi espacio de escritura <span aria-hidden="true">↗</span></Link>
      </header>
      <section ref={library} className={`published-library${list.isLoading ? ' is-refreshing' : ''}`} aria-labelledby="published-heading" aria-busy={list.isLoading}>
        <header className="published-library__heading">
          <h2 id="published-heading">Ensayos publicados</h2>
          {status === 'ready' && <span aria-live="polite">{list.total} {hasFilters ? (list.total === 1 ? 'resultado' : 'resultados') : (list.total === 1 ? 'lectura disponible' : 'lecturas disponibles')}</span>}
        </header>

        <ArticleFilters filters={list.filters} options={options} onChange={list.setFilters} onClear={list.clearFilters} />

        {status === 'loading' && <p className="status-message" role="status">Cargando ensayos publicados…</p>}
        {status === 'error' && <div className="status-message status-message--error" role="alert"><p>{list.error}</p><button type="button" className="button button--secondary" onClick={list.retry}>Reintentar</button></div>}
        {status === 'ready' && <>
          {list.articles.length === 0 ? (hasFilters
            ? <div className="published-empty" role="status">
                <span aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
                <h3>Ningún ensayo coincide con esos filtros.</h3>
                <p>Prueba quitando alguno o vuelve a la biblioteca completa.</p>
                <button type="button" className="button button--primary" onClick={list.clearFilters}>Limpiar filtros</button>
              </div>
            : <div className="published-empty"><span aria-hidden="true">＋</span><h3>La próxima lectura está por llegar.</h3><p>Todavía no hay ensayos publicados a los que tengas acceso.</p><Link className="button button--primary" to="/app/articles/new">Escribe el primero</Link></div>
          ) : <div className="published-list">{list.articles.map((article) => <article key={article.id} className="published-essay">
            <Link className="published-essay__cover" to={`/articles/${article.id}`} aria-label={`Leer “${article.title}”`}><EssayCover article={article} /></Link>
            <div className="published-essay__meta"><span>{article.isPremium ? <span className="premium-badge">Premium</span> : 'Lectura abierta'}</span>{article.publishedAt && <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(article.publishedAt))}</time>}</div>
            <h3><Link to={`/articles/${article.id}`}>{article.title}</Link></h3><p>{article.description || 'Una nueva mirada te espera en este ensayo.'}</p>
            {article.articleTags?.length > 0 && <ul className="tag-list" aria-label="Etiquetas">{article.articleTags.map(({ tag }) => <li key={tag}>#{tag}</li>)}</ul>}
          </article>)}</div>}
          {list.total > 0 && <nav className="pagination" aria-label="Paginación de ensayos publicados"><button type="button" className="button button--secondary" disabled={list.page <= 1} onClick={() => changePage(list.page - 1)}>Anterior</button><span>Página {list.page} de {list.totalPages} · {list.total} {list.total === 1 ? 'ensayo' : 'ensayos'}</span><button type="button" className="button button--secondary" disabled={list.page >= list.totalPages} onClick={() => changePage(list.page + 1)}>Siguiente</button></nav>}
        </>}
      </section>
    </main>
  )
}
