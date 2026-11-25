import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArticleTags, type TagOption } from '@/features/articles/api/articleTagsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './TagsPage.css'

export function TagsPage() {
  const [tags, setTags] = useState<TagOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listArticleTags(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setTags(result)
        setError('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  return (
    <main className="page-shell topics-page">
      <header className="page-header">
        <p className="eyebrow">La biblioteca de Noema</p>
        <h1>Explora por temas.</h1>
        <p>Encuentra ideas que te interesan y descubre los ensayos de cada tema.</p>
      </header>
      <section className="topics-page__paper" aria-labelledby="topics-heading" aria-busy={loading}>
        <h2 id="topics-heading">Todos los temas</h2>
        {loading ? <p role="status">Cargando temas…</p> : error ? (
          <div role="alert"><p>{error}</p><button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button></div>
        ) : tags.length === 0 ? (
          <div className="topics-page__empty" role="status">
            <h3>Aún no hay temas disponibles.</h3>
            <p>Cuando se publiquen ensayos con etiquetas, aparecerán aquí.</p>
            <Link className="button button--secondary" to="/articles">Ver ensayos publicados</Link>
          </div>
        ) : (
          <ul className="topics-page__tags" aria-label="Catálogo de etiquetas">
            {tags.map(({ tag, articles }) => (
              <li key={tag}>
                <Link to={`/articles?tag=${encodeURIComponent(tag)}`}>
                  <span>#{tag}</span>
                  <small>{articles} {articles === 1 ? 'ensayo' : 'ensayos'}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
