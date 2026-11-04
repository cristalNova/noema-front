import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArticleActionDialog } from '../../features/articles/components/ArticleActionDialog'
import { useMyArticles } from '../../features/articles/hooks/useMyArticles'
import type { ArticleStatus, ArticleSummary } from '../../features/articles/model/article.types'
import { ARTICLE_STATUSES, STATUS_ACTIONS, STATUS_LABELS, STATUS_TRANSITIONS } from '../../features/articles/model/myArticles'
import { ArticleStatusBadge } from '../../features/articles/components/ArticleStatusBadge'
import './MyArticlesPage.css'

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export function MyArticlesPage() {
  const list = useMyArticles()
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const [action, setAction] = useState<{ article: ArticleSummary; type: 'delete' | ArticleStatus } | null>(null)

  function closeDialog() {
    setAction(null)
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus()
      else heading.current?.focus()
    })
  }

  return (
    <main className="page-shell my-articles">
      <header className="my-articles__header">
        <div className="page-header"><p className="eyebrow">Noema · Espacio de escritura</p><h1 ref={heading} tabIndex={-1}>Mis ensayos</h1><p>Tus ideas, en cada etapa. Organiza lo que escribes y decide qué sigue.</p></div>
        <div className="my-articles__actions">
          <Link className="button button--secondary" to="/app/collections">Mis colecciones</Link>
          <Link className="button button--secondary" to="/articles">Ver ensayos publicados</Link>
          <Link className="button button--primary" to="/app/articles/new">Escribir un ensayo</Link>
        </div>
      </header>
      <nav className="article-filters" aria-label="Filtrar ensayos por estado">
        {(['ALL', ...ARTICLE_STATUSES] as const).map((status) => <button type="button" className="button button--secondary" key={status} aria-pressed={list.status === status} onClick={() => list.filter(status)}>{status === 'ALL' ? 'Todos' : STATUS_LABELS[status]} <span>({list.articles.filter((article) => status === 'ALL' || article.status === status).length})</span></button>)}
      </nav>
      <p className="article-notice" role="status">{list.notice}</p>
      {list.isLoading && <p role="status" className="status-message">Cargando tus ensayos…</p>}
      {!list.isLoading && list.loadError && <div className="status-message status-message--error" role="alert"><p>{list.loadError}</p><button type="button" className="button button--secondary" onClick={list.retry}>Reintentar</button></div>}
      {!list.isLoading && !list.loadError && <>
        {list.total === 0 ? <div className="article-empty"><h2>{list.status === 'ALL' ? 'Tu próxima idea tiene un lugar aquí.' : `No tienes ensayos en estado ${STATUS_LABELS[list.status].toLowerCase()}.`}</h2><p>{list.status === 'ALL' ? 'Escribe tu primer ensayo y guárdalo como borrador.' : 'Prueba con otro estado para ver tus ensayos.'}</p></div> : <>
          {ARTICLE_STATUSES.map((status) => {
            const rows = list.rows.filter((article) => article.status === status)
            return rows.length > 0 && <section className="article-group" key={status} aria-labelledby={`group-${status}`}>
              <h2 id={`group-${status}`}>{STATUS_LABELS[status]}</h2>
              <div className="article-table-wrap"><table className="article-table"><thead><tr><th scope="col">Título</th><th scope="col">Estado</th><th scope="col">Última actualización</th><th scope="col">Acciones</th></tr></thead><tbody>{rows.map((article) => <tr key={article.id}>
                <th scope="row"><Link to={`/app/articles/${article.id}`}>{article.title}</Link>{article.isPremium && <> <span className="premium-badge">Premium</span></>}</th>
                <td><ArticleStatusBadge status={article.status} /></td>
                <td><time dateTime={article.updatedAt}>{dateFormatter.format(new Date(article.updatedAt))}</time></td>
                <td><div className="article-row-actions"><Link className="button button--secondary" to={`/app/articles/${article.id}/edit`} aria-label={`Editar “${article.title}”`}>Editar</Link>{STATUS_TRANSITIONS[article.status].map((next) => <button key={next} className="button button--secondary" type="button" disabled={list.pendingId !== null} onClick={(event) => { trigger.current = event.currentTarget; setAction({ article, type: next }) }} aria-label={`${STATUS_ACTIONS[next]} “${article.title}”`}>{STATUS_ACTIONS[next]}</button>)}<button className="button article-delete-link" type="button" disabled={list.pendingId !== null} onClick={(event) => { trigger.current = event.currentTarget; setAction({ article, type: 'delete' }) }} aria-label={`Eliminar “${article.title}”`}>Eliminar</button></div></td>
              </tr>)}</tbody></table></div>
            </section>
          })}
          <nav className="pagination" aria-label="Paginación de mis ensayos"><button type="button" className="button button--secondary" disabled={list.currentPage <= 1} onClick={() => list.setPage(list.currentPage - 1)}>Anterior</button><span>Página {list.currentPage} de {list.totalPages} · {list.total} {list.total === 1 ? 'ensayo' : 'ensayos'}</span><button type="button" className="button button--secondary" disabled={list.currentPage >= list.totalPages} onClick={() => list.setPage(list.currentPage + 1)}>Siguiente</button></nav>
        </>}
      </>}
      {action && <ArticleActionDialog key={`${action.type}-${action.article.id}`} article={action.article} action={action.type} pending={list.pendingId !== null} onClose={closeDialog} onConfirm={(status) => list.mutate(action.article, status)} />}
    </main>
  )
}

