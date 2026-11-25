import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api/apiError'
import { listInProgress, resetProgress, type ReadingProgress } from '@/features/reading/api/progressApi'
import './ContinueReadingPage.css'

const PAGE_SIZE = 10

export function ContinueReadingPage() {
  const [entries, setEntries] = useState<ReadingProgress[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))

  useEffect(() => {
    const controller = new AbortController()
    listInProgress(controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setEntries(result)
      setError('')
      setLoading(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) { setError(getErrorMessage(reason)); setLoading(false) }
    })
    return () => controller.abort()
  }, [attempt])

  async function reset(articleId: number) {
    if (pending !== null) return
    setPending(articleId)
    setError('')
    try {
      await resetProgress(articleId)
      const next = entries.filter((entry) => entry.articleId !== articleId)
      setEntries(next)
      setPage((previous) => Math.min(previous, Math.max(1, Math.ceil(next.length / PAGE_SIZE))))
    } catch (reason) {
      setError(`No se pudo reiniciar el progreso. ${getErrorMessage(reason)}`)
    } finally { setPending(null) }
  }

  return <main className="page-shell continue-reading">
    <header className="page-header"><p className="eyebrow">La biblioteca de Noema</p><h1>Continuar leyendo</h1><p>Retoma tus ensayos donde te quedaste.</p></header>
    <section className="continue-reading__sheet" aria-label="Ensayos en curso" aria-busy={loading}>
      {loading && <p role="status">Cargando lecturas…</p>}
      {error && <div role="alert"><p>{error}</p>{!entries.length && <button className="button button--secondary" type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1) }}>Reintentar</button>}</div>}
      {!loading && !error && !entries.length && <div><h2>No tienes ensayos en curso.</h2><p>Explora la biblioteca y empieza una lectura.</p><Link className="button button--primary" to="/articles">Explorar ensayos</Link></div>}
      {!loading && entries.length > 0 && <><ul className="continue-reading__list">
        {entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => <li key={entry.articleId}>
          <div><h2><Link to={`/articles/${entry.articleId}?resume=1`}>{entry.article?.title ?? `Ensayo #${entry.articleId}`}</Link></h2><p>{entry.percentage} % leído</p><progress max={100} value={entry.percentage} aria-label={`Progreso de ${entry.article?.title ?? `ensayo ${entry.articleId}`}`} /></div>
          <div className="continue-reading__actions"><Link className="button button--primary" to={`/articles/${entry.articleId}?resume=1`}>Continuar</Link><button className="button button--secondary" type="button" disabled={pending !== null} onClick={() => void reset(entry.articleId)}>Reiniciar progreso</button></div>
        </li>)}
      </ul><nav className="continue-reading__pagination" aria-label="Paginación de lecturas"><button type="button" className="button button--secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className="button button--secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Siguiente</button></nav></>}
    </section>
  </main>
}
