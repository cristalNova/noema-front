import { Link } from 'react-router-dom'
import { EssayCover } from '../../features/articles/components/EssayCover'
import { usePublishedArticles } from '../../features/articles/hooks/usePublishedArticles'
import './PublishedArticlesPage.css'

export function PublishedArticlesPage() {
  const list = usePublishedArticles()
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
      <section className="published-library" aria-labelledby="published-heading" aria-busy={list.isLoading}>
      <header className="published-library__heading"><h2 id="published-heading">Ensayos publicados</h2>{!list.isLoading && !list.error && <span>{list.total} {list.total === 1 ? 'lectura disponible' : 'lecturas disponibles'}</span>}</header>
      {list.isLoading && <p className="status-message" role="status">Cargando ensayos publicados…</p>}
      {!list.isLoading && list.error && <div className="status-message status-message--error" role="alert"><p>{list.error}</p><button type="button" className="button button--secondary" onClick={list.retry}>Reintentar</button></div>}
      {!list.isLoading && !list.error && <>
        {list.articles.length === 0 ? <div className="published-empty"><span aria-hidden="true">＋</span><h3>La próxima lectura está por llegar.</h3><p>Todavía no hay ensayos publicados a los que tengas acceso.</p><Link className="button button--primary" to="/app/articles/new">Escribe el primero</Link></div> : <div className="published-list">{list.articles.map((article) => <article key={article.id} className="published-essay">
          <Link className="published-essay__cover" to={`/articles/${article.id}`} aria-label={`Leer “${article.title}”`}><EssayCover article={article} /></Link>
          <div className="published-essay__meta"><span>{article.isPremium ? 'Premium' : 'Lectura abierta'}</span>{article.publishedAt && <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(article.publishedAt))}</time>}</div>
          <h3><Link to={`/articles/${article.id}`}>{article.title}</Link></h3><p>{article.description || 'Una nueva mirada te espera en este ensayo.'}</p>
          {article.articleTags?.length > 0 && <ul className="tag-list" aria-label="Etiquetas">{article.articleTags.map(({ tag }) => <li key={tag}>#{tag}</li>)}</ul>}
        </article>)}</div>}
        {list.total > 0 && <nav className="pagination" aria-label="Paginación de ensayos publicados"><button type="button" className="button button--secondary" disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>Anterior</button><span>Página {list.page} de {list.totalPages} · {list.total} {list.total === 1 ? 'ensayo' : 'ensayos'}</span><button type="button" className="button button--secondary" disabled={list.page >= list.totalPages} onClick={() => list.setPage(list.page + 1)}>Siguiente</button></nav>}
      </>}
      </section>
    </main>
  )
}
