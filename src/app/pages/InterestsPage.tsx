import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPreferences, replacePreferences } from '@/features/profiles/api/preferencesApi'
import { listCatalogTags, type CatalogTag } from '@/features/articles/api/articleTagsApi'
import { getErrorMessage } from '@/shared/api/apiError'
import './P2Pages.css'
import './InterestsPage.css'

export default function InterestsPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<string[]>([])
  const [catalog, setCatalog] = useState<CatalogTag[]>([])
  const [custom, setCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getPreferences(controller.signal), listCatalogTags(controller.signal)])
      .then(([saved, available]) => { if (!controller.signal.aborted) { setTags(saved); setCatalog(available); setError('') } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(getErrorMessage(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  function toggle(tag: string) {
    setError('')
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 30 ? [...current, tag] : current)
  }

  function addCustom(event: FormEvent) {
    event.preventDefault()
    const value = custom.trim().toLowerCase()
    if (!value || value.length > 50) { setError('Cada interés debe tener entre 1 y 50 caracteres.'); return }
    if (tags.length >= 30 && !tags.includes(value)) { setError('Puedes seleccionar hasta 30 intereses.'); return }
    setTags((current) => current.includes(value) ? current : [...current, value])
    setCustom('')
    setError('')
  }

  async function save() {
    setSaving(true); setError('')
    try {
      await replacePreferences(tags)
      navigate('/', { replace: true })
    } catch (reason) { setError(getErrorMessage(reason)) }
    finally { setSaving(false) }
  }

  return <main className="page-shell p2-page interests-page">
    <header className="page-header"><p className="eyebrow">Noema · Tus lecturas</p><h1>Mis intereses.</h1><p>Elige temas para personalizar tus lecturas. Puedes volver y cambiarlos cuando quieras.</p></header>
    <section className="p2-sheet" aria-busy={loading}>
      {loading ? <p role="status">Cargando intereses…</p> : <>
        {error && <p className="p2-error" role="alert">{error} {catalog.length === 0 && <button type="button" onClick={() => { setLoading(true); setAttempt((n) => n + 1) }}>Reintentar</button>}</p>}
        <h2>Temas disponibles</h2>
        <p className="p2-muted">{catalog.length ? 'Etiquetas de ensayos publicados.' : 'Aún no hay etiquetas publicadas. Añade un tema propio para empezar.'}</p>
        <div className="p2-tags">{catalog.map(({ tag, articles }) => <button key={tag} type="button" className={`p2-tag ${tags.includes(tag) ? 'p2-tag--active' : ''}`} aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)}>{tag} <small>{articles}</small></button>)}</div>
        <form className="p2-add" onSubmit={addCustom}><label htmlFor="interest">Otro interés</label><div><input id="interest" value={custom} maxLength={50} onChange={(event) => setCustom(event.target.value)} placeholder="P. ej., filosofía" /><button className="button button--secondary" type="submit">Añadir interés</button></div></form>
        <h2>Tu selección <span className="p2-muted">({tags.length}/30)</span></h2>
        {tags.length ? <div className="p2-tags">{tags.map((tag) => <button type="button" key={tag} className="p2-tag p2-tag--active" onClick={() => toggle(tag)} aria-label={`Quitar ${tag}`}>{tag} ×</button>)}</div> : <p className="p2-muted">Todavía no has elegido intereses.</p>}
        <div className="p2-actions"><Link className="button button--secondary" to="/">Volver al inicio</Link><button className="button button--primary" type="button" disabled={saving} onClick={save}>{saving ? 'Guardando…' : tags.length ? 'Guardar y continuar' : 'Omitir por ahora'}</button></div>
      </>}
    </section>
  </main>
}
